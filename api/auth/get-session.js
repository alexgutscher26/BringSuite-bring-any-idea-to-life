import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { auth } from '../../server/auth.js'
import { getOrigin } from '../../server/util.js'

/**
 * Handles the incoming request and responds with the session data.
 *
 * This function retrieves the origin from the request, constructs a new Request object to fetch session data from the authentication API, and processes the response. It sets the appropriate headers and sends the response back to the client. In case of an error, it responds with a JSON object indicating a null data state.
 *
 * @param {Object} req - The request object containing the incoming request data.
 * @param {Object} res - The response object used to send the response back to the client.
 */
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
