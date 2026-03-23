import type { PrismaClient } from '../prisma'
import type { IAvailabilityRepository } from '../../../domain/repositories'

export class PrismaAvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly db: PrismaClient) {}

  async getServiceType(id: string) {
    const st = await this.db.serviceType.findUniqueOrThrow({ where: { id } })
    return {
      durationMinutes: st.durationMinutes,
      requiredSkill: st.requiredSkill,
    }
  }

  async getOverlappingSlots(
    dealershipId: string,
    startTime: Date,
    endTime: Date,
  ) {
    return this.db.appointment.findMany({
      where: {
        dealershipId,
        status: { in: ['pending', 'confirmed'] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { serviceBayId: true, technicianId: true },
    })
  }

  async findFreeServiceBay(dealershipId: string, excludedIds: string[]) {
    return this.db.serviceBay.findFirst({
      where: {
        dealershipId,
        isActive: true,
        id: { notIn: excludedIds },
      },
      select: { id: true },
    })
  }

  async findCandidateTechnicians(dealershipId: string, excludedIds: string[]) {
    return this.db.technician.findMany({
      where: {
        dealershipId,
        id: { notIn: excludedIds },
      },
      select: { id: true, skills: true },
    })
  }
}
