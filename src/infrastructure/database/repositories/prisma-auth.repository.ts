import type { PrismaClient } from '../prisma'
import type {
  IAuthRepository,
  CustomerRecord,
  CustomerPublicRecord,
  CreateCustomerData,
} from '../../../domain/repositories'

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(email: string): Promise<CustomerRecord | null> {
    return this.db.customer.findUnique({ where: { email } })
  }

  async createCustomer(
    data: CreateCustomerData,
  ): Promise<CustomerPublicRecord> {
    return this.db.customer.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })
  }
}
