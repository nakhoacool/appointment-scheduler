import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { SignJWT, jwtVerify } from 'jose'
import type { IAuthRepository } from '../../domain/repositories'
import { ConflictError, UnauthorizedError } from '../../errors'
import type { RegisterInput, LoginInput } from '../../domain/model/auth.schema'
import type { AuthResponseDto, TokenPayloadDto } from '../../domain/dto'

const scryptAsync = promisify(scrypt)

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  )
}

const JWT_ISSUER = 'appointment-scheduler'
const JWT_AUDIENCE = 'appointment-scheduler'

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${key.toString('hex')}`
}

async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const [salt, stored] = hash.split(':')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  const storedBuf = Buffer.from(stored, 'hex')
  return timingSafeEqual(derived, storedBuf)
}

export class AuthUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  private async issueToken(customerId: string, email: string): Promise<string> {
    return new SignJWT({ customerId, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime('7d')
      .sign(jwtSecret())
  }

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const existing = await this.repo.findByEmail(input.email)
    if (existing) throw new ConflictError('Email already registered')

    const passwordHash = await hashPassword(input.password)
    const customer = await this.repo.createCustomer({
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
    })

    const token = await this.issueToken(customer.id, customer.email)
    return { customer, token }
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const customer = await this.repo.findByEmail(input.email)
    if (!customer) throw new UnauthorizedError('Invalid email or password')

    const valid = await verifyPassword(input.password, customer.passwordHash)
    if (!valid) throw new UnauthorizedError('Invalid email or password')

    const token = await this.issueToken(customer.id, customer.email)
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt,
      },
      token,
    }
  }

  async verifyToken(token: string): Promise<TokenPayloadDto> {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return payload as { customerId: string; email: string }
  }
}
