import type {
  AvailabilityInput,
  AvailabilityResult,
  IAvailabilityRepository,
} from './availability.repository'

export interface AppointmentRecord {
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

export interface AppointmentCreateData {
  customerId: string
  vehicleId: string
  serviceTypeId: string
  dealershipId: string
  desiredStartTime: Date
}

export interface IBookingRepository {
  findVehicle(id: string): Promise<{ id: string; customerId: string } | null>
  /**
   * Atomically allocates resources and creates the appointment inside a
   * serializable transaction. The `allocate` callback receives a
   * tx-scoped IAvailabilityRepository so reads and write are atomic.
   */
  createAppointment(
    data: AppointmentCreateData,
    allocate: (repo: IAvailabilityRepository) => Promise<AvailabilityResult>,
  ): Promise<AppointmentRecord>
  findById(id: string): Promise<AppointmentRecord | null>
  listByCustomer(customerId: string): Promise<AppointmentRecord[]>
  cancel(id: string): Promise<{ id: string; status: string }>
}
