/**
 * Booking service — unit tests
 *
 * Covers appointment creation, ownership guards, cancellation, listing,
 * and double-booking prevention.
 */
import { describe, it, expect, vi } from 'vitest'
import { BookingUseCase } from '../use-cases/booking/booking.use-case'
import { AvailabilityUseCase } from '../use-cases/availability/availability.use-case'
import { NotFoundError, ForbiddenError, ConflictError } from '../errors'
import {
  setupTestDb,
  testPrisma,
  createBookingFixtures,
  createCustomer,
  createVehicle,
} from './helpers/db'
import { PrismaAvailabilityRepository } from '../infrastructure/database/repositories/prisma-availability.repository'
import { PrismaBookingRepository } from '../infrastructure/database/repositories/prisma-booking.repository'

// Silence logger output during tests
vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const availabilityUseCase = new AvailabilityUseCase(
  new PrismaAvailabilityRepository(testPrisma),
)
const bookingUseCase = new BookingUseCase(
  new PrismaBookingRepository(testPrisma),
  availabilityUseCase,
)

const START = new Date('2026-07-01T10:00:00.000Z')

describe('Booking Service', () => {
  setupTestDb()

  // ── createAppointment ──────────────────────────────────────────────────────

  describe('createAppointment', () => {
    it('creates a confirmed appointment with all relations populated', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()

      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      expect(appt.status).toBe('confirmed')
      expect(appt.customerId).toBe(customer.id)
      expect(appt.vehicleId).toBe(vehicle.id)
      expect(appt.dealership.id).toBe(dealership.id)
      expect(appt.serviceType.id).toBe(serviceType.id)
      expect(appt.technician).toBeTruthy()
      expect(appt.serviceBay).toBeTruthy()
    })

    it('persists the appointment to the database', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()

      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      const row = await testPrisma.appointment.findUnique({
        where: { id: appt.id },
      })
      expect(row).not.toBeNull()
      expect(row?.status).toBe('confirmed')
    })

    it('throws NotFoundError when vehicleId does not exist', async () => {
      const { dealership, serviceType, customer } =
        await createBookingFixtures()

      await expect(
        bookingUseCase.createAppointment(customer.id, {
          vehicleId: 'nonexistent-vehicle',
          serviceTypeId: serviceType.id,
          dealershipId: dealership.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when vehicle belongs to a different customer', async () => {
      const { dealership, serviceType, vehicle } = await createBookingFixtures()
      // cust-1 owns the vehicle; cust-2 tries to book it
      const otherCustomer = await createCustomer({
        id: 'cust-2',
        email: 'other@test.com',
      })

      await expect(
        bookingUseCase.createAppointment(otherCustomer.id, {
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          dealershipId: dealership.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ConflictError when the slot is fully booked (double-booking prevention)', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()

      // First booking succeeds
      await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      // Need a second vehicle for the second booking attempt
      const vehicle2 = await createVehicle(customer.id, {
        id: 'veh-2',
        licensePlate: 'TEST-002',
      })

      // Same slot → no free bay + technician → should conflict
      await expect(
        bookingUseCase.createAppointment(customer.id, {
          vehicleId: vehicle2.id,
          serviceTypeId: serviceType.id,
          dealershipId: dealership.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('succeeds for two consecutive non-overlapping bookings', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const vehicle2 = await createVehicle(customer.id, {
        id: 'veh-2',
        licensePlate: 'TEST-002',
      })

      const appt1 = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T09:00:00Z'),
      })
      const appt2 = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle2.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T10:00:00Z'),
      })

      expect(appt1.status).toBe('confirmed')
      expect(appt2.status).toBe('confirmed')
    })
  })

  // ── getAppointment ─────────────────────────────────────────────────────────

  describe('getAppointment', () => {
    it('returns the appointment for the owning customer', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      const fetched = await bookingUseCase.getAppointment(appt.id, customer.id)
      expect(fetched.id).toBe(appt.id)
    })

    it('throws NotFoundError for a non-existent appointment ID', async () => {
      await expect(
        bookingUseCase.getAppointment('does-not-exist', 'any-customer'),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when a different customer tries to read the appointment', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })
      const otherCustomer = await createCustomer({
        id: 'cust-2',
        email: 'other@test.com',
      })

      await expect(
        bookingUseCase.getAppointment(appt.id, otherCustomer.id),
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ── listAppointments ───────────────────────────────────────────────────────

  describe('listAppointments', () => {
    it('returns only appointments belonging to the requesting customer', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const otherCustomer = await createCustomer({
        id: 'cust-2',
        email: 'other@test.com',
      })
      const otherVehicle = await createVehicle(otherCustomer.id, {
        id: 'veh-2',
        licensePlate: 'OTHER-01',
      })

      await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T09:00:00Z'),
      })
      await bookingUseCase.createAppointment(otherCustomer.id, {
        vehicleId: otherVehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T10:00:00Z'),
      })

      const list = await bookingUseCase.listAppointments(customer.id)
      expect(list).toHaveLength(1)
      expect(list[0].customerId).toBe(customer.id)
    })

    it('returns an empty array when the customer has no appointments', async () => {
      const { customer } = await createBookingFixtures()
      const list = await bookingUseCase.listAppointments(customer.id)
      expect(list).toHaveLength(0)
    })

    it('orders appointments by startTime ascending', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const vehicle2 = await createVehicle(customer.id, {
        id: 'veh-2',
        licensePlate: 'TEST-002',
      })

      await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle2.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T14:00:00Z'),
      })
      await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: new Date('2026-07-01T09:00:00Z'),
      })

      const list = await bookingUseCase.listAppointments(customer.id)
      expect(new Date(list[0].startTime).getTime()).toBeLessThan(
        new Date(list[1].startTime).getTime(),
      )
    })
  })

  // ── cancelAppointment ──────────────────────────────────────────────────────

  describe('cancelAppointment', () => {
    it('sets status to "cancelled"', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      const result = await bookingUseCase.cancelAppointment(
        appt.id,
        customer.id,
      )
      expect(result.status).toBe('cancelled')
    })

    it('persists the cancellation to the database', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      await bookingUseCase.cancelAppointment(appt.id, customer.id)
      const row = await testPrisma.appointment.findUniqueOrThrow({
        where: { id: appt.id },
      })
      expect(row.status).toBe('cancelled')
    })

    it('throws NotFoundError for a non-existent appointment', async () => {
      await expect(
        bookingUseCase.cancelAppointment('ghost-id', 'any'),
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when a different customer tries to cancel', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })
      const intruder = await createCustomer({
        id: 'cust-2',
        email: 'evil@test.com',
      })

      await expect(
        bookingUseCase.cancelAppointment(appt.id, intruder.id),
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ConflictError on double-cancel', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const appt = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })

      await bookingUseCase.cancelAppointment(appt.id, customer.id)

      await expect(
        bookingUseCase.cancelAppointment(appt.id, customer.id),
      ).rejects.toThrow(ConflictError)
    })

    it('frees the slot — a new booking succeeds after cancellation', async () => {
      const { dealership, serviceType, customer, vehicle } =
        await createBookingFixtures()
      const vehicle2 = await createVehicle(customer.id, {
        id: 'veh-2',
        licensePlate: 'TEST-002',
      })

      const original = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })
      await bookingUseCase.cancelAppointment(original.id, customer.id)

      // Same slot must now be available again
      const rebooking = await bookingUseCase.createAppointment(customer.id, {
        vehicleId: vehicle2.id,
        serviceTypeId: serviceType.id,
        dealershipId: dealership.id,
        desiredStartTime: START,
      })
      expect(rebooking.status).toBe('confirmed')
    })
  })
})
