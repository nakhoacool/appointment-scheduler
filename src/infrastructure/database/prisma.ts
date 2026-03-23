import { PrismaClient } from '../../../generated/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

export type { PrismaClient }

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})

export const prisma = new PrismaClient({ adapter })

// Type alias for the transaction client — same query API as PrismaClient
// but without lifecycle methods ($connect, $disconnect, $transaction, etc.)
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
