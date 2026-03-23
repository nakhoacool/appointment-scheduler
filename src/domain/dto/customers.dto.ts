export interface CustomerProfileDto {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
}

export interface VehicleDto {
  id: string
  customerId: string
  make: string
  model: string
  year: number
  licensePlate: string
}
