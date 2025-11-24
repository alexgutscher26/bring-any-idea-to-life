import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import Stripe from 'stripe'
import { json, getOrigin, readBody } from '../server/util.js'

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
const stripe = new Stripe(stripeSecret)

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' })
  if (!stripeSecret) return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' })
  try {
    const raw = await readBody(req)
    const { plan } = JSON.parse(raw || '{}')
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
  } catch {
    return json(res, 500, { error: 'Failed to create checkout session' })
  }
}
