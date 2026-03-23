export interface CustomerDto {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: Date
}

export interface AuthResponseDto {
  customer: CustomerDto
  token: string
}

export interface TokenPayloadDto {
  customerId: string
  email: string
}
