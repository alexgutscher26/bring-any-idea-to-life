import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { auth } from '../../server/auth.js'
import { getOrigin } from '../../server/util.js'

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const request = new Request(new URL('/api/auth/get-session', origin), { method: 'GET', headers: req.headers })
    const response = await auth.handler(request)
    const headersObj = {}
    response.headers.forEach((v, k) => { headersObj[k] = v })
    res.writeHead(response.status, headersObj)
    const ab = await response.arrayBuffer()
    res.end(Buffer.from(ab))
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ data: null }))
  }
}
