/**
 * Composition root — the single place where every service is instantiated
 * and its dependencies wired together.
 *
 * Nothing in this file contains business logic; it purely constructs the
 * object graph and exports the singletons that the rest of the app consumes.
 */
import { prisma } from './infrastructure/database/prisma'
import { createAuthMiddleware } from './infrastructure/http/middleware/auth.middleware'

import {
  PrismaAuthRepository,
  PrismaAvailabilityRepository,
  PrismaBookingRepository,
  PrismaCustomersRepository,
  PrismaReferenceRepository,
} from './infrastructure/database/repositories'

import {
  AuthUseCase,
  AvailabilityUseCase,
  BookingUseCase,
  CustomersUseCase,
  ReferenceUseCase,
} from './use-cases'

// ── Repositories (infrastructure) ───────────────────────────────────────────
const authRepository = new PrismaAuthRepository(prisma)
const availabilityRepository = new PrismaAvailabilityRepository(prisma)
const bookingRepository = new PrismaBookingRepository(prisma)
const customersRepository = new PrismaCustomersRepository(prisma)
const referenceRepository = new PrismaReferenceRepository(prisma)

// ── Use Cases (application) ──────────────────────────────────────────────────
const authService = new AuthUseCase(authRepository)
const availabilityService = new AvailabilityUseCase(availabilityRepository)
const customersService = new CustomersUseCase(customersRepository)
const bookingService = new BookingUseCase(
  bookingRepository,
  availabilityService,
)
const referenceService = new ReferenceUseCase(
  referenceRepository,
  availabilityService,
)

/** Express middleware that verifies the Bearer JWT on every protected route. */
export const requireAuth = createAuthMiddleware(authService)

export { authService, customersService, bookingService, referenceService }
