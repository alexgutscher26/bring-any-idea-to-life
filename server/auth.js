import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prismaPkg from '@prisma/client'
const { PrismaClient } = prismaPkg
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

let authInstance
export function getAuth() {
  if (authInstance) return authInstance
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })
  authInstance = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
    secret: process.env.BETTER_AUTH_SECRET || 'dev-secret',
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
    ],
  })
  return authInstance
}

export const auth = getAuth()
