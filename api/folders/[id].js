import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../../server/db.js'
import { json, readBody } from '../../server/util.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') return json(res, 405, { error: 'Method Not Allowed' })
  const userId = req.headers['x-user-id']?.toString()
  if (!userId) return json(res, 401, { error: 'Missing user' })
  const id = (req.query?.id || '').toString()
  const raw = await readBody(req)
  try {
    const body = JSON.parse(raw || '{}')
    const folder = await prisma.folder.update({ where: { id }, data: { name: body.name, updatedAt: new Date() } })
    return json(res, 200, folder)
  } catch { return json(res, 404, { error: 'Not found' }) }
}
