import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../../server/db.js'
import { json } from '../../server/util.js'

export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`
    return json(res, 200, { ok: true })
  } catch (e) {
    return json(res, 500, { ok: false })
  }
}
