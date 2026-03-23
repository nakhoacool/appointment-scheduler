import type { PrismaClient } from '../prisma'
import type {
  IReferenceRepository,
  DealershipRecord,
  ServiceTypeRecord,
} from '../../../domain/repositories'

export class PrismaReferenceRepository implements IReferenceRepository {
  constructor(private readonly db: PrismaClient) {}

  async listDealerships(): Promise<DealershipRecord[]> {
    return this.db.dealership.findMany({
      include: {
        serviceBays: {
          where: { isActive: true },
          select: { id: true, bayNumber: true },
        },
        _count: { select: { technicians: true } },
      },
    })
  }

  async listServiceTypes(): Promise<ServiceTypeRecord[]> {
    return this.db.serviceType.findMany({ orderBy: { name: 'asc' } })
  }
}
