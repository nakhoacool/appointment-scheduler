import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import type { PrismaClient } from '../prisma'
import { ConflictError } from '../../../errors'
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
    try {
      return await this.db.vehicle.create({
        data: { ...data, customerId },
      })
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictError(
          `A vehicle with license plate '${data.licensePlate}' already exists`,
        )
      }
      throw err
    }
  }
}
