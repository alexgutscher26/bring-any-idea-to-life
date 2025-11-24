import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import Stripe from 'stripe'
import { json, readBody } from '../server/util.js'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const stripe = new Stripe(stripeSecret)

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' })
  if (!stripeSecret) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
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
  } catch {
    return json(res, 400, { error: 'Invalid webhook signature' })
  }
}
