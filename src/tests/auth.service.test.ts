/**
 * Auth service — unit tests
 *
 * Tests register, login, token issuance, and password verification in isolation
 * against a real (in-memory) test database.
 */
import { describe, it, expect } from 'vitest'
import { AuthUseCase } from '../use-cases/auth/auth.use-case'
import { ConflictError, UnauthorizedError } from '../errors'
import { setupTestDb, testPrisma } from './helpers/db'
import { PrismaAuthRepository } from '../infrastructure/database/repositories/prisma-auth.repository'

const authUseCase = new AuthUseCase(new PrismaAuthRepository(testPrisma))

describe('Auth Service', () => {
  setupTestDb()

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new customer and returns a JWT', async () => {
      const result = await authUseCase.register({
        name: 'Alice',
        email: 'alice@test.com',
        password: 'password123',
      })

      expect(result.customer).toMatchObject({
        name: 'Alice',
        email: 'alice@test.com',
      })
      expect(result.customer).not.toHaveProperty('passwordHash')
      expect(typeof result.token).toBe('string')
      expect(result.token.split('.')).toHaveLength(3) // valid JWT structure
    })

    it('persists the customer to the database', async () => {
      await authUseCase.register({
        name: 'Bob',
        email: 'bob@test.com',
        password: 'password123',
      })

      const row = await testPrisma.customer.findUnique({
        where: { email: 'bob@test.com' },
      })
      expect(row).not.toBeNull()
      expect(row?.name).toBe('Bob')
    })

    it('hashes the password (stored hash !== plain text)', async () => {
      await authUseCase.register({
        name: 'Carol',
        email: 'carol@test.com',
        password: 'mypassword',
      })

      const row = await testPrisma.customer.findUniqueOrThrow({
        where: { email: 'carol@test.com' },
      })
      expect(row.passwordHash).not.toBe('mypassword')
      expect(row.passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/)
    })

    it('throws ConflictError when email is already registered', async () => {
      await authUseCase.register({
        name: 'Dave',
        email: 'dave@test.com',
        password: 'password123',
      })

      await expect(
        authUseCase.register({
          name: 'Dave 2',
          email: 'dave@test.com',
          password: 'other123',
        }),
      ).rejects.toThrow(ConflictError)
    })

    it('stores an optional phone number', async () => {
      await authUseCase.register({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'password123',
        phone: '+1-555-0000',
      })

      const row = await testPrisma.customer.findUniqueOrThrow({
        where: { email: 'eve@test.com' },
      })
      expect(row.phone).toBe('+1-555-0000')
    })
  })

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns a JWT and customer info on correct credentials', async () => {
      await authUseCase.register({
        name: 'Frank',
        email: 'frank@test.com',
        password: 'secret99',
      })

      const result = await authUseCase.login({
        email: 'frank@test.com',
        password: 'secret99',
      })

      expect(result.customer.email).toBe('frank@test.com')
      expect(typeof result.token).toBe('string')
    })

    it('throws UnauthorizedError for an unknown email', async () => {
      await expect(
        authUseCase.login({ email: 'nobody@test.com', password: 'anything' }),
      ).rejects.toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for a wrong password', async () => {
      await authUseCase.register({
        name: 'Grace',
        email: 'grace@test.com',
        password: 'correct',
      })

      await expect(
        authUseCase.login({ email: 'grace@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedError)
    })

    it('does not leak whether the email exists in the error message', async () => {
      await authUseCase.register({
        name: 'Heidi',
        email: 'heidi@test.com',
        password: 'pw',
      })

      const wrongEmail = authUseCase.login({
        email: 'notexist@test.com',
        password: 'pw',
      })
      const wrongPass = authUseCase.login({
        email: 'heidi@test.com',
        password: 'wrong',
      })

      const [errA, errB] = await Promise.allSettled([wrongEmail, wrongPass])
      // Both must fail with the same message
      expect((errA as PromiseRejectedResult).reason.message).toBe(
        'Invalid email or password',
      )
      expect((errB as PromiseRejectedResult).reason.message).toBe(
        'Invalid email or password',
      )
    })
  })

  // ── verifyToken ────────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('round-trips register → verifyToken', async () => {
      const { token, customer } = await authUseCase.register({
        name: 'Ivan',
        email: 'ivan@test.com',
        password: 'pw123456',
      })

      const payload = await authUseCase.verifyToken(token)

      expect(payload.customerId).toBe(customer.id)
      expect(payload.email).toBe('ivan@test.com')
    })

    it('rejects a tampered token', async () => {
      const { token } = await authUseCase.register({
        name: 'Judy',
        email: 'judy@test.com',
        password: 'pw123456',
      })
      const tampered = token.slice(0, -5) + 'XXXXX'

      await expect(authUseCase.verifyToken(tampered)).rejects.toThrow()
    })

    it('rejects a token signed with a different secret', async () => {
      const { SignJWT } = await import('jose')
      const wrongSecret = new TextEncoder().encode('totally-different-secret')
      const fakeToken = await new SignJWT({
        customerId: 'fake',
        email: 'fake@test.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('appointment-scheduler')
        .setAudience('appointment-scheduler')
        .setExpirationTime('1h')
        .sign(wrongSecret)

      await expect(authUseCase.verifyToken(fakeToken)).rejects.toThrow()
    })
  })
})
