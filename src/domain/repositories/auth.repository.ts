export interface CustomerRecord {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
  passwordHash: string
}

export interface CustomerPublicRecord {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
}

export interface CreateCustomerData {
  name: string
  email: string
  passwordHash: string
  phone?: string
}

export interface IAuthRepository {
  findByEmail(email: string): Promise<CustomerRecord | null>
  createCustomer(data: CreateCustomerData): Promise<CustomerPublicRecord>
}
