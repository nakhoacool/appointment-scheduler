import type { IBookingRepository } from '../../domain/repositories'
import type { AvailabilityUseCase } from '../availability/availability.use-case'
import { NotFoundError, ForbiddenError, ConflictError } from '../../errors'
import { logger } from '../../logger'
import type { CreateAppointmentInput } from '../../domain/model/booking.schema'
import type { AppointmentDto, CancelAppointmentDto } from '../../domain/dto'

export class BookingUseCase {
  constructor(
    private readonly repo: IBookingRepository,
    private readonly availabilityUseCase: AvailabilityUseCase,
  ) {}

  async createAppointment(
    customerId: string,
    input: CreateAppointmentInput,
  ): Promise<AppointmentDto> {
    const vehicle = await this.repo.findVehicle(input.vehicleId)
    if (!vehicle) throw new NotFoundError('Vehicle')
    if (vehicle.customerId !== customerId)
      throw new ForbiddenError('Vehicle does not belong to you')

    const appt = await this.repo.createAppointment(
      {
        customerId,
        vehicleId: input.vehicleId,
        serviceTypeId: input.serviceTypeId,
        dealershipId: input.dealershipId,
        desiredStartTime: input.desiredStartTime,
      },
      (txRepo) =>
        this.availabilityUseCase.findAvailableResources(txRepo, {
          dealershipId: input.dealershipId,
          serviceTypeId: input.serviceTypeId,
          desiredStartTime: input.desiredStartTime,
        }),
    )

    logger.info({ appointmentId: appt.id, customerId }, 'appointment.created')
    return appt
  }

  async getAppointment(
    appointmentId: string,
    customerId: string,
  ): Promise<AppointmentDto> {
    const appt = await this.repo.findById(appointmentId)
    if (!appt) throw new NotFoundError('Appointment')
    if (appt.customerId !== customerId) throw new ForbiddenError()
    return appt
  }

  async listAppointments(customerId: string): Promise<AppointmentDto[]> {
    return this.repo.listByCustomer(customerId)
  }

  async cancelAppointment(
    appointmentId: string,
    customerId: string,
  ): Promise<CancelAppointmentDto> {
    const appt = await this.repo.findById(appointmentId)
    if (!appt) throw new NotFoundError('Appointment')
    if (appt.customerId !== customerId) throw new ForbiddenError()
    if (appt.status === 'cancelled') {
      throw new ConflictError('Appointment is already cancelled')
    }
    return this.repo.cancel(appointmentId)
  }
}
