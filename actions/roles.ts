'use server'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getRoles() {
  try {
    return await db.role.findMany({
      where: { deletedAt: null, deletedBy: null },
    })
  } catch (error) {
    return []
  }
}

export const getRolesClient = action.use(authenticationMiddleware).action(async () => {
  return getRoles()
})
