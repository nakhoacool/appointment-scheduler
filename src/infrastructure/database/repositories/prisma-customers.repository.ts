import type { PrismaClient } from '../prisma'
import type {
  ICustomersRepository,
  CustomerProfileRecord,
  VehicleRecord,
  CreateVehicleData,
} from '../../../domain/repositories'

export class PrismaCustomersRepository implements ICustomersRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<CustomerProfileRecord | null> {
    return this.db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })
  }

  async listVehicles(customerId: string): Promise<VehicleRecord[]> {
    return this.db.vehicle.findMany({
      where: { customerId },
      orderBy: { make: 'asc' },
    })
  }

  async createVehicle(
    customerId: string,
    data: CreateVehicleData,
  ): Promise<VehicleRecord> {
    return this.db.vehicle.create({
      data: { ...data, customerId },
    })
  }
}
