import type { ICustomersRepository } from '../../domain/repositories'
import { NotFoundError } from '../../errors'
import type { AddVehicleInput } from '../../domain/model/customers.schema'
import type { CustomerProfileDto, VehicleDto } from '../../domain/dto'

export class CustomersUseCase {
  constructor(private readonly repo: ICustomersRepository) {}

  async getProfile(customerId: string): Promise<CustomerProfileDto> {
    const customer = await this.repo.findById(customerId)
    if (!customer) throw new NotFoundError('Customer')
    return customer
  }

  async listVehicles(customerId: string): Promise<VehicleDto[]> {
    return this.repo.listVehicles(customerId)
  }

  async addVehicle(
    customerId: string,
    input: AddVehicleInput,
  ): Promise<VehicleDto> {
    return this.repo.createVehicle(customerId, input)
  }
}
