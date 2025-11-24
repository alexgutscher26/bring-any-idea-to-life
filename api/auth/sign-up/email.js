import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { auth } from '../../../server/auth.js'
import { getOrigin, readBody } from '../../../server/util.js'

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const body = await readBody(req)
    const request = new Request(new URL('/api/auth/sign-up/email', origin), { method: req.method, headers: req.headers, body })
    const response = await auth.handler(request)
    const headersObj = {}
    response.headers.forEach((v, k) => { headersObj[k] = v })
    res.writeHead(response.status, headersObj)
    const ab = await response.arrayBuffer()
    res.end(Buffer.from(ab))
  } catch {
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Auth handler failed' }))
  }
}
