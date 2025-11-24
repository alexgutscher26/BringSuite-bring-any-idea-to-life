import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { prisma } from '../../server/db.js'
import { json } from '../../server/util.js'

/**
 * Handles the deletion of a resource based on the provided user ID and resource ID.
 *
 * The function first checks if the request method is DELETE; if not, it responds with a 405 status.
 * It then retrieves the user ID from the request headers and checks its presence. If the user ID is missing,
 * it responds with a 401 status. Finally, it attempts to delete the resource using the provided ID,
 * responding with a 200 status on success or a 404 status if the resource is not found.
 *
 * @param req - The request object containing the method, headers, and query parameters.
 * @param res - The response object used to send back the desired HTTP response.
 * @returns A JSON response indicating the success or failure of the deletion operation.
 * @throws Error If the resource to be deleted is not found.
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return json(res, 405, { error: 'Method Not Allowed' })
  const userId = req.headers['x-user-id']?.toString()
  if (!userId) return json(res, 401, { error: 'Missing user' })
  const id = (req.query?.id || '').toString()
  try {
    await prisma.creation.delete({ where: { id } })
    return json(res, 200, { ok: true })
  } catch { return json(res, 404, { error: 'Not found' }) }
}
