import { PrismaClient } from '../../generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

function getSqliteDbPath() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  const filePath = url.startsWith('file:') ? url.slice('file:'.length) : url
  // Resolve relative to the backend root (one level up from src/lib)
  return path.resolve(__dirname, '../../', filePath)
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${getSqliteDbPath()}` } as any),
    log: ['error', 'warn'],
  } as any)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// eslint-disable-next-line no-console
console.log('[prisma] sqlite db =', getSqliteDbPath())

