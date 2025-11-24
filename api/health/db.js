import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../../server/db.js'
import { json } from '../../server/util.js'

/**
 * Handles the incoming request and response for the API.
 *
 * This function executes a raw SQL query using Prisma to check the database connection.
 * If the query is successful, it responds with a 200 status and an object indicating success.
 * In case of an error, it catches the exception and responds with a 500 status and an object indicating failure.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`
    return json(res, 200, { ok: true })
  } catch (e) {
    return json(res, 500, { ok: false })
  }
}
