import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import Stripe from 'stripe'
import { getAuth } from '../server/auth.js'
import { prisma } from '../server/db.js'
import { json, getOrigin, readBody } from '../server/util.js'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const clientOrigin = process.env.CLIENT_ORIGIN || 'https://bringsuite.com'
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

export default async function handler(req, res) {
  const origin = getOrigin(req)
  const url = new URL(req.url || '/', origin)
  const method = req.method || 'GET'
  const path = url.searchParams.get('path') ? `/api/${url.searchParams.get('path')}` : url.pathname

  if (path.startsWith('/api/auth')) {
    try {
      const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req)
      const request = new Request(new URL(path + url.search, origin), { method, headers: req.headers, body })
      const response = await getAuth().handler(request)
      if (path.endsWith('/get-session') && response.status >= 400) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: null }))
        return
      }
      const headersObj = {}
      response.headers.forEach((v, k) => { headersObj[k] = v })
      res.writeHead(response.status, headersObj)
      const ab = await response.arrayBuffer()
      res.end(Buffer.from(ab))
    } catch {
      if (path.endsWith('/get-session')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: null }))
      } else {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Auth handler failed' }))
      }
    }
    return
  }

  if (path === '/api/health/db') {
    try { await prisma.$queryRaw`SELECT 1`; return json(res, 200, { ok: true }) } catch { return json(res, 500, { ok: false }) }
  }

  if (path === '/api/creations' && method === 'GET') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try { const items = await prisma.creation.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } }); return json(res, 200, items) } catch { return json(res, 500, { error: 'Failed to fetch' }) }
  }

  if (path === '/api/creations' && method === 'POST') {
    const userId = req.headers['x-user-id']?.toString()
    const userEmail = req.headers['x-user-email']?.toString() || ''
    const userName = req.headers['x-user-name']?.toString() || ''
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const raw = await readBody(req)
    try {
      const body = JSON.parse(raw || '{}')
      await prisma.user.upsert({ where: { id: userId }, update: { updatedAt: new Date() }, create: { id: userId, name: userName || 'User', email: userEmail || `${userId}@example.local`, updatedAt: new Date() } })
      const creation = await prisma.creation.upsert({
        where: { id: body.id },
        update: { name: body.name, files: body.files, originalImage: body.originalImage, folderId: body.folderId, timestamp: new Date(body.timestamp || Date.now()), updatedAt: new Date() },
        create: { id: body.id, userId, name: body.name, files: body.files, originalImage: body.originalImage, folderId: body.folderId, timestamp: new Date(body.timestamp || Date.now()), updatedAt: new Date() }
      })
      return json(res, 200, creation)
    } catch { return json(res, 400, { error: 'Invalid body' }) }
  }

  if (path.startsWith('/api/creations/') && method === 'DELETE') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const id = path.split('/').pop()
    try { await prisma.creation.delete({ where: { id } }); return json(res, 200, { ok: true }) } catch { return json(res, 404, { error: 'Not found' }) }
  }

  if (path === '/api/folders' && method === 'GET') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try { const items = await prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }); return json(res, 200, items) } catch { return json(res, 500, { error: 'Failed to fetch' }) }
  }

  if (path === '/api/folders' && method === 'POST') {
    const userId = req.headers['x-user-id']?.toString()
    const userEmail = req.headers['x-user-email']?.toString() || ''
    const userName = req.headers['x-user-name']?.toString() || ''
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const raw = await readBody(req)
    try {
      const body = JSON.parse(raw || '{}')
      if (!body.id || !body.name) return json(res, 400, { error: 'Missing id or name' })
      await prisma.user.upsert({ where: { id: userId }, update: { updatedAt: new Date() }, create: { id: userId, name: userName || 'User', email: userEmail || `${userId}@example.local`, updatedAt: new Date() } })
      const folder = await prisma.folder.create({ data: { id: body.id, name: body.name, userId, updatedAt: new Date() } })
      return json(res, 200, folder)
    } catch { return json(res, 500, { error: 'Failed to create folder' }) }
  }

  if (path.startsWith('/api/folders/') && method === 'PUT') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const id = path.split('/').pop()
    const raw = await readBody(req)
    try { const body = JSON.parse(raw || '{}'); const folder = await prisma.folder.update({ where: { id }, data: { name: body.name, updatedAt: new Date() } }); return json(res, 200, folder) } catch { return json(res, 404, { error: 'Not found' }) }
  }

  if (path === '/api/user/plan' && method === 'GET') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try { const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }); return json(res, 200, { plan: user?.plan || 'HOBBY' }) } catch { return json(res, 500, { error: 'Failed to fetch plan' }) }
  }

  if (path === '/api/user/plan' && method === 'POST') {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const raw = await readBody(req)
    try { const body = JSON.parse(raw || '{}'); const next = (body.plan || '').toUpperCase(); if (!['HOBBY', 'PRO'].includes(next)) return json(res, 400, { error: 'Invalid plan' }); await prisma.user.update({ where: { id: userId }, data: { plan: next } }); return json(res, 200, { ok: true }) } catch { return json(res, 400, { error: 'Invalid body' }) }
  }

  if (path === '/api/create-checkout-session' && method === 'POST') {
    if (!stripe) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
    const raw = await readBody(req)
    try {
      const { plan } = JSON.parse(raw || '{}')
      const isCreator = plan === 'creator'
      const productName = isCreator ? 'Creator Plan' : 'Hobbyist Plan'
      const unitAmount = isCreator ? 1200 : 0
      const mode = isCreator ? 'subscription' : 'payment'
      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: [{ price_data: { currency: 'usd', product_data: { name: productName }, unit_amount: unitAmount, recurring: mode === 'subscription' ? { interval: 'month' } : undefined }, quantity: 1 }],
        success_url: `${clientOrigin}/?checkout=success`,
        cancel_url: `${clientOrigin}/?checkout=cancel`,
      })
      return json(res, 200, { id: session.id, url: session.url })
    } catch { return json(res, 500, { error: 'Failed to create checkout session' }) }
  }

  if (path === '/api/webhook' && method === 'POST') {
    if (!stripe) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
    if (!webhookSecret) return json(res, 200, { received: true })
    try {
      const raw = await readBody(req)
      const sig = req.headers['stripe-signature']
      const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
      switch (event.type) {
        case 'checkout.session.completed':
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          break
        default:
          break
      }
      return json(res, 200, { received: true })
    } catch { return json(res, 400, { error: 'Invalid webhook signature' }) }
  }

  res.statusCode = 404
  res.end('Not Found')
}
