import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../../server/db.js'
import { json } from '../../server/util.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return json(res, 405, { error: 'Method Not Allowed' })
  const userId = req.headers['x-user-id']?.toString()
  if (!userId) return json(res, 401, { error: 'Missing user' })
  const id = (req.query?.id || '').toString()
  try {
    await prisma.creation.delete({ where: { id } })
    return json(res, 200, { ok: true })
  } catch { return json(res, 404, { error: 'Not found' }) }
}
