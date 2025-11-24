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
      const items = await prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
      return json(res, 200, items)
    } catch { return json(res, 500, { error: 'Failed to fetch' }) }
  }
  if (method === 'POST') {
    const userId = req.headers['x-user-id']?.toString()
    const userEmail = req.headers['x-user-email']?.toString() || ''
    const userName = req.headers['x-user-name']?.toString() || ''
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const raw = await readBody(req)
    try {
      const body = JSON.parse(raw || '{}')
      if (!body.id || !body.name) return json(res, 400, { error: 'Missing id or name' })
      await prisma.user.upsert({
        where: { id: userId },
        update: { updatedAt: new Date() },
        create: { id: userId, name: userName || 'User', email: userEmail || `${userId}@example.local`, updatedAt: new Date() }
      })
      const folder = await prisma.folder.create({ data: { id: body.id, name: body.name, userId, updatedAt: new Date() } })
      return json(res, 200, folder)
    } catch { return json(res, 500, { error: 'Failed to create folder' }) }
  }
  return json(res, 405, { error: 'Method Not Allowed' })
}
