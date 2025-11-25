import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import http from 'http'
import Stripe from 'stripe'
import { auth } from './auth.js'
import { prisma } from './db.js'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3001'
const stripe = new Stripe(stripeSecret)

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getOrigin(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'http').toString()
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').toString()
  return `${proto}://${host}`
}

async function handleCreateCheckoutSession(req, res, rawBody) {
  if (!stripeSecret) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
  try {
    const { plan } = JSON.parse(rawBody || '{}')
    const origin = getOrigin(req)
    const isCreator = plan === 'creator'
    const productName = isCreator ? 'Creator Plan' : 'Hobbyist Plan'
    const unitAmount = isCreator ? 1200 : 0
    const mode = isCreator ? 'subscription' : 'payment'

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: productName },
            unit_amount: unitAmount,
            recurring: mode === 'subscription' ? { interval: 'month' } : undefined,
          },
          quantity: 1,
        },
      ],
      success_url: `${clientOrigin}/?checkout=success`,
      cancel_url: `${clientOrigin}/?checkout=cancel`,
    })

    return json(res, 200, { id: session.id, url: session.url })
  } catch (e) {
    console.error('Failed to create checkout session:', e)
    return json(res, 500, { error: 'Failed to create checkout session' })
  }
}

/**
 * Handles incoming webhook events from Stripe.
 *
 * The function first checks for the presence of the STRIPE_SECRET_KEY and webhookSecret. If either is missing, it returns an appropriate response. It then attempts to validate the webhook signature and process specific event types. If the signature validation fails, it logs the error and returns a 400 response indicating an invalid signature.
 *
 * @param req - The request object containing the webhook data.
 * @param res - The response object used to send responses back to the client.
 * @param rawBody - The raw body of the request for signature verification.
 * @returns A JSON response indicating the result of the webhook handling.
 * @throws Error If the webhook signature validation fails.
 */
async function handleWebhook(req, res, rawBody) {
  if (!stripeSecret) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
  if (!webhookSecret) return json(res, 200, { received: true })
  try {
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
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
  } catch (e) {
    console.error('Webhook signature validation failed:', e)
    return json(res, 400, { error: 'Invalid webhook signature' })
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const method = req.method || 'GET'
  console.log('Incoming request:', method, url.pathname)

  const userIdHeader = req.headers['x-user-id']?.toString()
  const userEmailHeader = req.headers['x-user-email']?.toString() || ''
  const userNameHeader = req.headers['x-user-name']?.toString() || ''

  async function ensureUser(userId) {
    if (!userId) return
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: { updatedAt: new Date() },
        create: {
          id: userId,
          name: userNameHeader || 'User',
          email: userEmailHeader || `${userId}@example.local`,
          updatedAt: new Date(),
        }
      })
    } catch { }
  }

  if (url.pathname.startsWith('/api/auth')) {
    console.log('Auth request:', method, url.pathname)
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        const origin = getOrigin(req)
        const request = new Request(new URL(url.pathname + url.search, origin), {
          method,
          headers: req.headers,
          body: ['GET', 'HEAD'].includes(method) ? undefined : data,
        })
        const response = await auth.handler(request)
        console.log('Auth handler responded:', response.status)
        const headersObj = {}
        response.headers.forEach((v, k) => { headersObj[k] = v })
        res.writeHead(response.status, headersObj)
        const ab = await response.arrayBuffer()
        res.end(Buffer.from(ab))
      } catch (e) {
        if (url.pathname.endsWith('/get-session')) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ data: null }))
        } else {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Auth handler failed' }))
        }
      }
    })
    return
  }

  if (method === 'GET' && url.pathname === '/api/creations') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try {
      const items = await prisma.creation.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } })
      return json(res, 200, items)
    } catch { return json(res, 500, { error: 'Failed to fetch' }) }
  }

  if (method === 'POST' && url.pathname === '/api/creations') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        const body = JSON.parse(data || '{}')
        await ensureUser(userId)
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
    })
    return
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/creations/')) {
    const userId = req.headers['x-user-id']?.toString()
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const id = url.pathname.split('/').pop()
    try {
      await prisma.creation.delete({ where: { id } })
      return json(res, 200, { ok: true })
    } catch { return json(res, 404, { error: 'Not found' }) }
  }

  if (method === 'GET' && url.pathname === '/api/folders') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try {
      const items = await prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
      return json(res, 200, items)
    } catch (e) { console.error('Folders GET failed for user', userId, e); return json(res, 500, { error: 'Failed to fetch' }) }
  }

  if (method === 'GET' && url.pathname === '/api/user/plan') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
      return json(res, 200, { plan: user?.plan || 'HOBBY' })
    } catch { return json(res, 500, { error: 'Failed to fetch plan' }) }
  }

  if (method === 'POST' && url.pathname === '/api/user/plan') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        const body = JSON.parse(data || '{}')
        const next = (body.plan || '').toUpperCase()
        if (!['HOBBY', 'PRO'].includes(next)) return json(res, 400, { error: 'Invalid plan' })
        await ensureUser(userId)
        await prisma.user.update({ where: { id: userId }, data: { plan: next } })
        return json(res, 200, { ok: true })
      } catch { return json(res, 400, { error: 'Invalid body' }) }
    })
    return
  }

  if (method === 'POST' && url.pathname === '/api/folders') {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        console.log('Folders POST raw:', data)
        const body = JSON.parse(data || '{}')
        console.log('Folders POST parsed:', { userId, id: body.id, name: body.name })
        if (!body.id || !body.name) return json(res, 400, { error: 'Missing id or name' })
        await ensureUser(userId)
        const folder = await prisma.folder.create({ data: { id: body.id, name: body.name, userId, updatedAt: new Date() } })
        return json(res, 200, folder)
      } catch (e) { return json(res, 500, { error: 'Failed to create folder' }) }
    })
    return
  }

  if (method === 'PUT' && url.pathname.startsWith('/api/folders/')) {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const id = url.pathname.split('/').pop()
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        const body = JSON.parse(data || '{}')
        await ensureUser(userId)
        const folder = await prisma.folder.update({ where: { id }, data: { name: body.name, updatedAt: new Date() } })
        return json(res, 200, folder)
      } catch { return json(res, 404, { error: 'Not found' }) }
    })
    return
  }

  if (method === 'DELETE' && url.pathname.startsWith('/api/folders/')) {
    const userId = userIdHeader
    if (!userId) return json(res, 401, { error: 'Missing user' })
    const id = url.pathname.split('/').pop()
    try {
      // First, move all creations in this folder back to root (set folderId to null)
      await prisma.creation.updateMany({
        where: { folderId: id },
        data: { folderId: null }
      })
      // Now delete the folder
      await prisma.folder.delete({ where: { id } })
      return json(res, 200, { ok: true })
    } catch { return json(res, 404, { error: 'Not found' }) }
  }

  if (method === 'POST' && url.pathname === '/api/create-checkout-session') {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => { handleCreateCheckoutSession(req, res, data) })
    return
  }

  if (method === 'POST' && url.pathname === '/api/webhook') {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => { handleWebhook(req, res, data) })
    return
  }

  res.statusCode = 404
  res.end('Not Found')
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Stripe server listening on http://localhost:${PORT}`)
})
