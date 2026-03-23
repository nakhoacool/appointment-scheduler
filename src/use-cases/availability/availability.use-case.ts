import type {
  IAvailabilityRepository,
  AvailabilityInput,
  AvailabilityResult,
} from '../../domain/repositories'
import { ConflictError } from '../../errors'

export class AvailabilityUseCase {
  constructor(private readonly repo: IAvailabilityRepository) {}

  /**
   * Core availability logic. Accepts an explicit `repo` argument so it can be
   * invoked with a transaction-scoped repository (for atomic booking creation)
   * or with the default injected repository (for read-only probes).
   */
  async findAvailableResources(
    repo: IAvailabilityRepository,
    input: AvailabilityInput,
  ): Promise<AvailabilityResult> {
    const serviceType = await repo.getServiceType(input.serviceTypeId)

    const startTime = input.desiredStartTime
    const endTime = new Date(
      startTime.getTime() + serviceType.durationMinutes * 60_000,
    )

    const overlapping = await repo.getOverlappingSlots(
      input.dealershipId,
      startTime,
      endTime,
    )

    const takenBayIds = overlapping.map((a) => a.serviceBayId)
    const takenTechIds = overlapping.map((a) => a.technicianId)

    const freeBay = await repo.findFreeServiceBay(
      input.dealershipId,
      takenBayIds,
    )
    if (!freeBay) {
      throw new ConflictError(
        'No service bay is available for the requested time slot',
      )
    }

    const candidates = await repo.findCandidateTechnicians(
      input.dealershipId,
      takenTechIds,
    )
    const technician = candidates.find((t) => {
      const skills: string[] = JSON.parse(t.skills)
      return skills.includes(serviceType.requiredSkill)
    })

    if (!technician) {
      throw new ConflictError(
        'No qualified technician is available for the requested time slot',
      )
    }

    return {
      bayId: freeBay.id,
      technicianId: technician.id,
      startTime,
      endTime,
    }
  }

  /**
   * Read-only availability probe — uses the injected repository directly.
   * Safe to call outside a transaction.
   */
  async probeAvailability(
    input: AvailabilityInput,
  ): Promise<AvailabilityResult> {
    return this.findAvailableResources(this.repo, input)
  }
}
