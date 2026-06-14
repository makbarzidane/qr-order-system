import { PrismaClient } from '@prisma/client'

// Prevent multiple Prisma instances during Next.js hot-reload in dev
const globalForPrisma = globalThis as unknown as { _prisma: PrismaClient | undefined }

export const prisma: PrismaClient =
  globalForPrisma._prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma._prisma = prisma
}
