import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { auth } from '../../server/auth.js'
import { getOrigin, readBody } from '../../server/util.js'

export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const body = ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : await readBody(req)
    const request = new Request(new URL(req.url, origin), { method: req.method, headers: req.headers, body })
    const response = await auth.handler(request)
    const headersObj = {}
    response.headers.forEach((v, k) => { headersObj[k] = v })
    res.writeHead(response.status, headersObj)
    const ab = await response.arrayBuffer()
    res.end(Buffer.from(ab))
  } catch {
    if ((req.url || '').endsWith('/get-session')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data: null }))
    } else {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Auth handler failed' }))
    }
  }
}
