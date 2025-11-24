import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getAuth } from '../../server/auth.js'
import { getOrigin } from '../../server/util.js'

/**
 * Handles the authentication sign-out process.
 *
 * This function retrieves the origin from the request, constructs a new Request object for the sign-out API,
 * and invokes the authentication handler. It processes the response headers and status,
 * then sends the appropriate response back to the client. In case of an error, it responds with a 500 status
 * and an error message.
 *
 * @param {Object} req - The request object containing the HTTP request data.
 * @param {Object} res - The response object used to send the HTTP response.
 */
export default async function handler(req, res) {
  try {
    const origin = getOrigin(req)
    const request = new Request(new URL('/api/auth/sign-out', origin), { method: req.method, headers: req.headers })
    const response = await getAuth().handler(request)
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
