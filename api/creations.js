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
      const items = await prisma.creation.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } })
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
      await prisma.user.upsert({
        where: { id: userId },
        update: { updatedAt: new Date() },
        create: { id: userId, name: userName || 'User', email: userEmail || `${userId}@example.local`, updatedAt: new Date() }
      })
      const creation = await prisma.creation.upsert({
        where: { id: body.id },
        update: {
          name: body.name,
          files: body.files,
          originalImage: body.originalImage,
          folderId: body.folderId,
          timestamp: new Date(body.timestamp || Date.now()),
          updatedAt: new Date(),
        },
        create: {
          id: body.id,
          userId,
          name: body.name,
          files: body.files,
          originalImage: body.originalImage,
          folderId: body.folderId,
          timestamp: new Date(body.timestamp || Date.now()),
          updatedAt: new Date(),
        }
      })
      return json(res, 200, creation)
    } catch { return json(res, 400, { error: 'Invalid body' }) }
  }
  return json(res, 405, { error: 'Method Not Allowed' })
}
