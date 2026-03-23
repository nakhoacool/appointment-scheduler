import type { IReferenceRepository } from '../../domain/repositories'
import type { AvailabilityUseCase } from '../availability/availability.use-case'
import { ConflictError } from '../../errors'
import type { AvailabilityQueryInput } from '../../domain/model/reference.schema'
import type {
  DealershipDto,
  ServiceTypeDto,
  AvailabilitySlotDto,
} from '../../domain/dto'

export class ReferenceUseCase {
  constructor(
    private readonly repo: IReferenceRepository,
    private readonly availabilityUseCase: AvailabilityUseCase,
  ) {}

  async listDealerships(): Promise<DealershipDto[]> {
    const records = await this.repo.listDealerships()
    return records.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      serviceBays: r.serviceBays,
      technicianCount: r._count.technicians,
    }))
  }

  async listServiceTypes(): Promise<ServiceTypeDto[]> {
    return this.repo.listServiceTypes()
  }

  async getDealershipAvailability(
    dealershipId: string,
    input: AvailabilityQueryInput,
  ): Promise<AvailabilitySlotDto[]> {
    const { serviceTypeId, date, hour } = input
    const startHour = hour ?? 9
    const endHour = hour != null ? startHour + 1 : 17

    const slots: AvailabilitySlotDto[] = []

    for (let h = startHour; h < endHour; h++) {
      const desiredStartTime = new Date(
        `${date}T${String(h).padStart(2, '0')}:00:00.000Z`,
      )
      try {
        const { startTime, endTime } =
          await this.availabilityUseCase.probeAvailability({
            dealershipId,
            serviceTypeId,
            desiredStartTime,
          })
        slots.push({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          available: true,
        })
      } catch (err) {
        if (err instanceof ConflictError) {
          slots.push({
            startTime: desiredStartTime.toISOString(),
            endTime: desiredStartTime.toISOString(),
            available: false,
          })
        } else {
          throw err
        }
      }
    }

    return slots
  }
}
