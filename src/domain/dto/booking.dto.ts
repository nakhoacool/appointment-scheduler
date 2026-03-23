export interface AppointmentDto {
  id: string
  customerId: string
  vehicleId: string
  serviceTypeId: string
  technicianId: string
  serviceBayId: string
  dealershipId: string
  startTime: Date
  endTime: Date
  status: string
  createdAt: Date
  customer: { id: string; name: string; email: string }
  vehicle: {
    id: string
    customerId: string
    make: string
    model: string
    year: number
    licensePlate: string
  }
  serviceType: {
    id: string
    name: string
    durationMinutes: number
    requiredSkill: string
  }
  technician: { id: string; name: string }
  serviceBay: { id: string; bayNumber: number }
  dealership: { id: string; name: string }
}

export interface CancelAppointmentDto {
  id: string
  status: string
}
