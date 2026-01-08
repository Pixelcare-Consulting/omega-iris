'use server'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import z from 'zod'

export async function getRolePermissions(roleId: string) {
  if (!roleId) return []

  try {
    return db.rolePermission.findMany({ where: { roleId } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getRolePermissionsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ roleId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getRolePermissions(parsedInput.roleId)
  })
