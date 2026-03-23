import 'dotenv/config'
import { PrismaClient } from '../generated/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { scrypt, randomBytes } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${key.toString('hex')}`
}

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...\n')

  // ── Service Types ────────────────────────────────────────────────────────────
  const serviceTypes = await Promise.all([
    prisma.serviceType.upsert({
      where: { id: 'st-oil-change' },
      update: {},
      create: {
        id: 'st-oil-change',
        name: 'Oil Change',
        durationMinutes: 30,
        requiredSkill: 'oil_change',
      },
    }),
    prisma.serviceType.upsert({
      where: { id: 'st-tire-rotation' },
      update: {},
      create: {
        id: 'st-tire-rotation',
        name: 'Tire Rotation',
        durationMinutes: 45,
        requiredSkill: 'tire_rotation',
      },
    }),
    prisma.serviceType.upsert({
      where: { id: 'st-brake-service' },
      update: {},
      create: {
        id: 'st-brake-service',
        name: 'Brake Service',
        durationMinutes: 90,
        requiredSkill: 'brake_service',
      },
    }),
    prisma.serviceType.upsert({
      where: { id: 'st-engine-diag' },
      update: {},
      create: {
        id: 'st-engine-diag',
        name: 'Engine Diagnostic',
        durationMinutes: 60,
        requiredSkill: 'engine_diagnostic',
      },
    }),
    prisma.serviceType.upsert({
      where: { id: 'st-transmission' },
      update: {},
      create: {
        id: 'st-transmission',
        name: 'Transmission Service',
        durationMinutes: 120,
        requiredSkill: 'transmission',
      },
    }),
  ])
  console.log(`✅ ${serviceTypes.length} service types`)

  // ── Dealerships ──────────────────────────────────────────────────────────────
  const d1 = await prisma.dealership.upsert({
    where: { id: 'dl-downtown' },
    update: {},
    create: {
      id: 'dl-downtown',
      name: 'Downtown Auto Service',
      address: '100 Main St, Downtown',
    },
  })
  const d2 = await prisma.dealership.upsert({
    where: { id: 'dl-uptown' },
    update: {},
    create: {
      id: 'dl-uptown',
      name: 'Uptown Motors',
      address: '500 Park Ave, Uptown',
    },
  })
  console.log('✅ 2 dealerships')

  // ── Service Bays ─────────────────────────────────────────────────────────────
  for (let bay = 1; bay <= 3; bay++) {
    await prisma.serviceBay.upsert({
      where: { id: `sb-downtown-${bay}` },
      update: {},
      create: { id: `sb-downtown-${bay}`, dealershipId: d1.id, bayNumber: bay },
    })
  }
  for (let bay = 1; bay <= 2; bay++) {
    await prisma.serviceBay.upsert({
      where: { id: `sb-uptown-${bay}` },
      update: {},
      create: { id: `sb-uptown-${bay}`, dealershipId: d2.id, bayNumber: bay },
    })
  }
  console.log('✅ 5 service bays')

  // ── Technicians ──────────────────────────────────────────────────────────────
  const techs1 = [
    {
      id: 'tech-alice',
      name: 'Alice Johnson',
      skills: JSON.stringify(['oil_change', 'tire_rotation', 'brake_service']),
    },
    {
      id: 'tech-bob',
      name: 'Bob Smith',
      skills: JSON.stringify([
        'engine_diagnostic',
        'transmission',
        'oil_change',
      ]),
    },
    {
      id: 'tech-carol',
      name: 'Carol Davis',
      skills: JSON.stringify([
        'oil_change',
        'tire_rotation',
        'engine_diagnostic',
      ]),
    },
  ]
  const techs2 = [
    {
      id: 'tech-dave',
      name: 'Dave Wilson',
      skills: JSON.stringify(['oil_change', 'tire_rotation', 'transmission']),
    },
    {
      id: 'tech-emma',
      name: 'Emma Brown',
      skills: JSON.stringify([
        'brake_service',
        'engine_diagnostic',
        'tire_rotation',
      ]),
    },
  ]
  for (const t of [...techs1, ...techs2]) {
    const dealershipId = techs1.includes(t) ? d1.id : d2.id
    await prisma.technician.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, dealershipId },
    })
  }
  console.log('✅ 5 technicians')

  // ── Test Customer & Vehicle ───────────────────────────────────────────────────
  const passwordHash = await hashPassword('password123')
  const customer = await prisma.customer.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: 'cust-test',
      name: 'Test Customer',
      email: 'test@example.com',
      passwordHash,
      phone: '+1-555-0100',
    },
  })
  await prisma.vehicle.upsert({
    where: { id: 'veh-test' },
    update: {},
    create: {
      id: 'veh-test',
      customerId: customer.id,
      make: 'Toyota',
      model: 'Camry',
      year: 2021,
      licensePlate: 'ABC-1234',
    },
  })
  console.log('✅ Test customer + vehicle')

  console.log('\n──────────────────────────────────────────────')
  console.log('Seed complete! Use these in the test harness:')
  console.log('  Email:         test@example.com')
  console.log('  Password:      password123')
  console.log('  Vehicle ID:    veh-test')
  console.log(`  Dealership 1:  ${d1.id}`)
  console.log(`  Dealership 2:  ${d2.id}`)
  console.log('  Service Types:')
  for (const st of serviceTypes) {
    console.log(`    ${st.id.padEnd(20)} ${st.name}`)
  }
  console.log('──────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
