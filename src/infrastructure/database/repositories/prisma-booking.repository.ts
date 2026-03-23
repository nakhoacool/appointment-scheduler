import type { PrismaClient } from '../prisma'
import type {
  IBookingRepository,
  AppointmentCreateData,
  AppointmentRecord,
  IAvailabilityRepository,
  AvailabilityResult,
} from '../../../domain/repositories'
import { PrismaAvailabilityRepository } from './prisma-availability.repository'

const APPOINTMENT_INCLUDE = {
  customer: { select: { id: true, name: true, email: true } },
  vehicle: true,
  serviceType: true,
  technician: { select: { id: true, name: true } },
  serviceBay: { select: { id: true, bayNumber: true } },
  dealership: { select: { id: true, name: true } },
} as const

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly db: PrismaClient) {}

  async findVehicle(id: string) {
    return this.db.vehicle.findUnique({
      where: { id },
      select: { id: true, customerId: true },
    })
  }

  async createAppointment(
    data: AppointmentCreateData,
    allocate: (repo: IAvailabilityRepository) => Promise<AvailabilityResult>,
  ): Promise<AppointmentRecord> {
    return this.db.$transaction(
      async (tx) => {
        const txRepo = new PrismaAvailabilityRepository(tx as PrismaClient)
        const { bayId, technicianId, startTime, endTime } =
          await allocate(txRepo)

        return tx.appointment.create({
          data: {
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            serviceTypeId: data.serviceTypeId,
            technicianId,
            serviceBayId: bayId,
            dealershipId: data.dealershipId,
            startTime,
            endTime,
            status: 'confirmed',
          },
          include: APPOINTMENT_INCLUDE,
        }) as Promise<AppointmentRecord>
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async findById(id: string): Promise<AppointmentRecord | null> {
    return this.db.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    }) as Promise<AppointmentRecord | null>
  }

  async listByCustomer(customerId: string): Promise<AppointmentRecord[]> {
    return this.db.appointment.findMany({
      where: { customerId },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startTime: 'asc' },
    }) as Promise<AppointmentRecord[]>
  }

  async cancel(id: string): Promise<{ id: string; status: string }> {
    return this.db.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
      select: { id: true, status: true },
    })
  }
}
