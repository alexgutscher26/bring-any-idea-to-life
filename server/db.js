import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { Pool } from 'pg'
import prismaPkg from '@prisma/client'
const { PrismaClient } = prismaPkg
import { PrismaPg } from '@prisma/adapter-pg'

let prismaInstance
/**
 * Retrieves a singleton instance of PrismaClient.
 */
export function getPrisma() {
  if (prismaInstance) return prismaInstance
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  prismaInstance = new PrismaClient({ adapter })
  return prismaInstance
}
