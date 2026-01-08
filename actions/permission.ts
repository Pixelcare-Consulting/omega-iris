'use server'

import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_PERMISSION_ORDER_BY = { name: 'asc' } satisfies Prisma.PermissionOrderByWithRelationInput

export async function getPermissions() {
  try {
    return db.permission.findMany({
      orderBy: COMMON_PERMISSION_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPermissionsClient = action.use(authenticationMiddleware).action(async () => {
  return getPermissions()
})
