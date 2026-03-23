/**
 * Shared test helpers
 *
 * Uses a separate SQLite file (test.db) so tests never touch dev.db.
 * Call `setupTestDb()` at the top of every integration test file.
 */
import { execSync } from 'child_process'
import { PrismaClient } from '../../../generated/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { beforeAll, afterAll, afterEach } from 'vitest'

// ── Re-usable Prisma client pointing at test.db ───────────────────────────────
const adapter = new PrismaLibSql({ url: 'file:./test.db' })
export const testPrisma = new PrismaClient({ adapter })

/** Wire up migrations + cleanup around an entire test suite. */
export function setupTestDb() {
  beforeAll(async () => {
    // Apply all pending migrations to test.db (idempotent)
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'pipe',
    })
  }, 60_000) // allow up to 60 s for the first run

  afterEach(async () => {
    // Wipe data between tests (preserve schema) — order respects FK constraints
    await testPrisma.appointment.deleteMany()
    await testPrisma.vehicle.deleteMany()
    await testPrisma.technician.deleteMany()
    await testPrisma.serviceBay.deleteMany()
    await testPrisma.customer.deleteMany()
    await testPrisma.serviceType.deleteMany()
    await testPrisma.dealership.deleteMany()
  })

  afterAll(async () => {
    await testPrisma.$disconnect()
  })
}

// ── Fixture builders ──────────────────────────────────────────────────────────

export async function createDealership(
  overrides?: Partial<{ id: string; name: string; address: string }>,
) {
  return testPrisma.dealership.create({
    data: {
      id: 'dl-test',
      name: 'Test Dealership',
      address: '1 Test St',
      ...overrides,
    },
  })
}

export async function createServiceType(
  overrides?: Partial<{
    id: string
    name: string
    durationMinutes: number
    requiredSkill: string
  }>,
) {
  return testPrisma.serviceType.create({
    data: {
      id: 'st-oil',
      name: 'Oil Change',
      durationMinutes: 30,
      requiredSkill: 'oil_change',
      ...overrides,
    },
  })
}

export async function createServiceBay(
  dealershipId: string,
  overrides?: Partial<{ id: string; bayNumber: number }>,
) {
  return testPrisma.serviceBay.create({
    data: {
      id: 'sb-1',
      dealershipId,
      bayNumber: 1,
      isActive: true,
      ...overrides,
    },
  })
}

export async function createTechnician(
  dealershipId: string,
  overrides?: Partial<{ id: string; name: string; skills: string }>,
) {
  return testPrisma.technician.create({
    data: {
      id: 'tech-1',
      dealershipId,
      name: 'Bob Tech',
      skills: JSON.stringify(['oil_change', 'tire_rotation']),
      ...overrides,
    },
  })
}

export async function createCustomer(
  overrides?: Partial<{
    id: string
    email: string
    name: string
    passwordHash: string
  }>,
) {
  return testPrisma.customer.create({
    data: {
      id: 'cust-1',
      name: 'Test User',
      email: 'user@test.com',
      passwordHash: 'salt:hash', // placeholder — auth tests use real hashing
      ...overrides,
    },
  })
}

export async function createVehicle(
  customerId: string,
  overrides?: Partial<{ id: string; licensePlate: string }>,
) {
  return testPrisma.vehicle.create({
    data: {
      id: 'veh-1',
      customerId,
      make: 'Toyota',
      model: 'Camry',
      year: 2021,
      licensePlate: 'TEST-001',
      ...overrides,
    },
  })
}

/** Creates a full slot of fixtures needed for most booking tests. */
export async function createBookingFixtures() {
  const dealership = await createDealership()
  const serviceType = await createServiceType()
  const bay = await createServiceBay(dealership.id)
  const technician = await createTechnician(dealership.id)
  const customer = await createCustomer()
  const vehicle = await createVehicle(customer.id)
  return { dealership, serviceType, bay, technician, customer, vehicle }
}
