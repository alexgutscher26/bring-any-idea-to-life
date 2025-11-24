import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../server/db.js'
import { json, readBody } from '../server/util.js'

export default async function handler(req, res) {
  const method = req.method || 'GET'
  if (method === 'GET') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
      return json(res, 200, { plan: user?.plan || 'HOBBY' })
    } catch { return json(res, 500, { error: 'Failed to fetch plan' }) }
  }
  if (method === 'POST') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const raw = await readBody(req)
    try {
      const body = JSON.parse(raw || '{}')
      const next = (body.plan || '').toUpperCase()
      if (!['HOBBY', 'PRO'].includes(next)) return json(res, 400, { error: 'Invalid plan' })
      await prisma.user.update({ where: { id: userId }, data: { plan: next } })
      return json(res, 200, { ok: true })
    } catch { return json(res, 400, { error: 'Invalid body' }) }
  }
  return json(res, 405, { error: 'Method Not Allowed' })
}
