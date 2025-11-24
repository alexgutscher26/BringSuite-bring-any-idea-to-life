import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { auth } from '../../../server/auth.js'
import { getOrigin, readBody } from '../../../server/util.js'

/**
 * Handles the authentication sign-up process via email.
 *
 * This function retrieves the origin from the request, reads the request body,
 * and constructs a new Request object to send to the authentication handler.
 * It processes the response, setting the appropriate headers and status code
 * before sending the response back to the client. In case of an error, it
 * responds with a 500 status code and an error message.
 *
 * @param {Object} req - The request object containing the HTTP request data.
 * @param {Object} res - The response object used to send the HTTP response.
 */
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
