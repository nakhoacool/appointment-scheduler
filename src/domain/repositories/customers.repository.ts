export interface CustomerProfileRecord {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
}

export interface VehicleRecord {
  id: string
  customerId: string
  make: string
  model: string
  year: number
  licensePlate: string
}

export interface CreateVehicleData {
  make: string
  model: string
  year: number
  licensePlate: string
}

export interface ICustomersRepository {
  findById(id: string): Promise<CustomerProfileRecord | null>
  listVehicles(customerId: string): Promise<VehicleRecord[]>
  createVehicle(
    customerId: string,
    data: CreateVehicleData,
  ): Promise<VehicleRecord>
}
