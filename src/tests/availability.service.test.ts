/**
 * Availability service — unit tests
 *
 * Tests the core "find a free bay + qualified technician" logic, including
 * conflict detection for overlapping appointments.
 */
import { describe, it, expect } from 'vitest'
import { AvailabilityUseCase } from '../use-cases/availability/availability.use-case'
import { ConflictError } from '../errors'
import {
  setupTestDb,
  testPrisma,
  createBookingFixtures,
  createServiceBay,
  createTechnician,
} from './helpers/db'
import { PrismaAvailabilityRepository } from '../infrastructure/database/repositories/prisma-availability.repository'

const availabilityRepo = new PrismaAvailabilityRepository(testPrisma)
const availabilityUseCase = new AvailabilityUseCase(availabilityRepo)

// The tx() helper is no longer needed — findAvailableResources now takes a
// repository instance rather than a raw transaction client.

const START = new Date('2026-06-01T09:00:00.000Z')

describe('Availability Service', () => {
  setupTestDb()

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('findAvailableResources — happy path', () => {
    it('returns a bay and technician when the slot is free', async () => {
      const { dealership, serviceType, bay, technician } =
        await createBookingFixtures()

      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        },
      )

      expect(result.bayId).toBe(bay.id)
      expect(result.technicianId).toBe(technician.id)
    })

    it('calculates endTime as startTime + durationMinutes', async () => {
      const { dealership, serviceType } = await createBookingFixtures()

      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        },
      )

      const expectedEnd = new Date(
        START.getTime() + serviceType.durationMinutes * 60_000,
      )
      expect(result.endTime.getTime()).toBe(expectedEnd.getTime())
    })

    it('picks the technician with the correct required skill', async () => {
      const { dealership } = await createBookingFixtures()

      // Add a second service type requiring a different skill
      const brakeService = await testPrisma.serviceType.create({
        data: {
          id: 'st-brake',
          name: 'Brake Service',
          durationMinutes: 60,
          requiredSkill: 'brake_service',
        },
      })
      // Add a technician who only knows brake_service (not oil_change)
      const brakeOnly = await createTechnician(dealership.id, {
        id: 'tech-brake',
        name: 'Brake Specialist',
        skills: JSON.stringify(['brake_service']),
      })

      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: brakeService.id,
          desiredStartTime: START,
        },
      )

      expect(result.technicianId).toBe(brakeOnly.id)
    })

    it('uses any free bay when multiple bays exist', async () => {
      const { dealership, serviceType } = await createBookingFixtures()
      const bay2 = await createServiceBay(dealership.id, {
        id: 'sb-2',
        bayNumber: 2,
      })

      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        },
      )

      expect([bay2.id, 'sb-1']).toContain(result.bayId)
    })
  })

  // ── No bay available ───────────────────────────────────────────────────────

  describe('findAvailableResources — no bay available', () => {
    it('throws ConflictError when the single bay is already booked for that slot', async () => {
      const { dealership, serviceType, bay, technician, customer, vehicle } =
        await createBookingFixtures()

      // Pre-occupy the only bay with a confirmed appointment
      await testPrisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          technicianId: technician.id,
          serviceBayId: bay.id,
          dealershipId: dealership.id,
          startTime: START,
          endTime: new Date(START.getTime() + 30 * 60_000),
          status: 'confirmed',
        },
      })

      // Add a second technician so the "no tech" path isn't triggered first
      await createTechnician(dealership.id, {
        id: 'tech-2',
        name: 'Extra Tech',
        skills: JSON.stringify(['oil_change']),
      })

      await expect(
        availabilityUseCase.findAvailableResources(availabilityRepo, {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('allows booking in a slot that does NOT overlap', async () => {
      const { dealership, serviceType, bay, technician, customer, vehicle } =
        await createBookingFixtures()

      // Morning slot occupied
      await testPrisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          technicianId: technician.id,
          serviceBayId: bay.id,
          dealershipId: dealership.id,
          startTime: new Date('2026-06-01T09:00:00Z'),
          endTime: new Date('2026-06-01T09:30:00Z'),
          status: 'confirmed',
        },
      })

      // Afternoon slot should succeed
      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: new Date('2026-06-01T14:00:00Z'),
        },
      )

      expect(result.bayId).toBe(bay.id)
    })

    it('treats cancelled appointments as not blocking', async () => {
      const { dealership, serviceType, bay, technician, customer, vehicle } =
        await createBookingFixtures()

      await testPrisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          technicianId: technician.id,
          serviceBayId: bay.id,
          dealershipId: dealership.id,
          startTime: START,
          endTime: new Date(START.getTime() + 30 * 60_000),
          status: 'cancelled',
        },
      })

      // Cancelled appointment must NOT block the same slot
      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        },
      )

      expect(result.bayId).toBe(bay.id)
    })
  })

  // ── No technician available ────────────────────────────────────────────────

  describe('findAvailableResources — no technician available', () => {
    it('throws ConflictError when no technician has the required skill', async () => {
      const { dealership } = await createBookingFixtures()
      // createBookingFixtures already adds bay + technician with oil_change skill

      // New service type needing a skill nobody has
      const exotic = await testPrisma.serviceType.create({
        data: {
          id: 'st-exotic',
          name: 'Exotic Repair',
          durationMinutes: 60,
          requiredSkill: 'exotic_skill',
        },
      })

      await expect(
        availabilityUseCase.findAvailableResources(availabilityRepo, {
          dealershipId: dealership.id,
          serviceTypeId: exotic.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('throws ConflictError when all qualified technicians are already booked', async () => {
      const { dealership, serviceType, bay, technician, customer, vehicle } =
        await createBookingFixtures()

      // Occupy the only qualified technician
      await testPrisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          technicianId: technician.id,
          serviceBayId: bay.id,
          dealershipId: dealership.id,
          startTime: START,
          endTime: new Date(START.getTime() + 30 * 60_000),
          status: 'confirmed',
        },
      })

      // Add a second bay so the bay check passes
      await createServiceBay(dealership.id, { id: 'sb-2', bayNumber: 2 })

      await expect(
        availabilityUseCase.findAvailableResources(availabilityRepo, {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: START,
        }),
      ).rejects.toThrow(ConflictError)
    })
  })

  // ── Boundary conditions ────────────────────────────────────────────────────

  describe('time-boundary edge cases', () => {
    it('adjacent slots (end == next start) do NOT conflict', async () => {
      // slot A: 09:00 – 09:30; slot B starts exactly at 09:30
      const { dealership, serviceType, bay, technician, customer, vehicle } =
        await createBookingFixtures()

      await testPrisma.appointment.create({
        data: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          serviceTypeId: serviceType.id,
          technicianId: technician.id,
          serviceBayId: bay.id,
          dealershipId: dealership.id,
          startTime: new Date('2026-06-01T09:00:00Z'),
          endTime: new Date('2026-06-01T09:30:00Z'),
          status: 'confirmed',
        },
      })

      // This must succeed (starts exactly when the previous one ends)
      const result = await availabilityUseCase.findAvailableResources(
        availabilityRepo,
        {
          dealershipId: dealership.id,
          serviceTypeId: serviceType.id,
          desiredStartTime: new Date('2026-06-01T09:30:00Z'),
        },
      )

      expect(result.startTime.toISOString()).toBe('2026-06-01T09:30:00.000Z')
    })
  })
})
