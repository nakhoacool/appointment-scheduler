/**
 * Zod schema validation — unit tests
 *
 * These are pure unit tests (no DB, no network) that verify the request
 * validation layer rejects bad inputs and transforms valid ones correctly.
 */
import { describe, it, expect } from 'vitest'
import { RegisterSchema, LoginSchema } from '../domain/model/auth.schema'
import { CreateAppointmentSchema } from '../domain/model/booking.schema'

// ── RegisterSchema ─────────────────────────────────────────────────────────

describe('RegisterSchema', () => {
  const valid = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'password123',
  }

  it('accepts valid input', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional phone', () => {
    expect(
      RegisterSchema.safeParse({ ...valid, phone: '+1-555-0101' }).success,
    ).toBe(true)
  })

  it('rejects missing name', () => {
    const r = RegisterSchema.safeParse({ ...valid, name: '' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const r = RegisterSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(r.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const r = RegisterSchema.safeParse({ ...valid, password: 'short' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toMatch(/8 characters/i)
    }
  })

  it('rejects missing fields', () => {
    expect(RegisterSchema.safeParse({}).success).toBe(false)
  })
})

// ── LoginSchema ─────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      LoginSchema.safeParse({ email: 'a@b.com', password: 'pass' }).success,
    ).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(
      LoginSchema.safeParse({ email: 'bad', password: 'pass' }).success,
    ).toBe(false)
  })

  it('rejects empty password', () => {
    expect(
      LoginSchema.safeParse({ email: 'a@b.com', password: '' }).success,
    ).toBe(false)
  })
})

// ── CreateAppointmentSchema ─────────────────────────────────────────────────

describe('CreateAppointmentSchema', () => {
  const valid = {
    vehicleId: 'veh-1',
    serviceTypeId: 'st-oil-change',
    dealershipId: 'dl-downtown',
    desiredStartTime: '2026-06-01T09:00:00.000Z',
  }

  it('accepts a valid ISO 8601 UTC date-time', () => {
    const r = CreateAppointmentSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.desiredStartTime).toBeInstanceOf(Date)
      expect(r.data.desiredStartTime.toISOString()).toBe(
        '2026-06-01T09:00:00.000Z',
      )
    }
  })

  it('accepts date-time with timezone offset', () => {
    const r = CreateAppointmentSchema.safeParse({
      ...valid,
      desiredStartTime: '2026-06-01T10:00:00+01:00',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a plain date string (no time component)', () => {
    const r = CreateAppointmentSchema.safeParse({
      ...valid,
      desiredStartTime: '2026-06-01',
    })
    expect(r.success).toBe(false)
  })

  it('rejects a free-form date string', () => {
    const r = CreateAppointmentSchema.safeParse({
      ...valid,
      desiredStartTime: 'June 1 2026 9am',
    })
    expect(r.success).toBe(false)
  })

  it('rejects missing vehicleId', () => {
    const { vehicleId: _, ...rest } = valid
    expect(CreateAppointmentSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty vehicleId', () => {
    expect(
      CreateAppointmentSchema.safeParse({ ...valid, vehicleId: '' }).success,
    ).toBe(false)
  })

  it('rejects missing serviceTypeId', () => {
    const { serviceTypeId: _, ...rest } = valid
    expect(CreateAppointmentSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing dealershipId', () => {
    const { dealershipId: _, ...rest } = valid
    expect(CreateAppointmentSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing desiredStartTime', () => {
    const { desiredStartTime: _, ...rest } = valid
    expect(CreateAppointmentSchema.safeParse(rest).success).toBe(false)
  })

  it('transforms desiredStartTime from string to Date', () => {
    const r = CreateAppointmentSchema.parse(valid)
    expect(r.desiredStartTime).toBeInstanceOf(Date)
  })
})
