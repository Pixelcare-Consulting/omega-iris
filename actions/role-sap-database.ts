'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_ROLE_SAP_DATABASE_INCLUDE = {
  role: { select: { code: true, name: true } },
  sapDatabase: true,
} as Prisma.RoleSapDatabaseInclude

const COMMON_ROLE_SAP_DATABASE_ORDER_BY = [
  { sapDatabase: { order: 'asc' } },
  { sapDatabase: { name: 'asc' } },
] satisfies Prisma.RoleSapDatabaseOrderByWithRelationInput[]

export async function getRoleSapDatabasesByRoleCode(roleCode?: number | null) {
  if (!roleCode) return []

  try {
    return db.roleSapDatabase.findMany({
      where: { roleCode },
      include: COMMON_ROLE_SAP_DATABASE_INCLUDE,
      orderBy: COMMON_ROLE_SAP_DATABASE_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getRoleSapDatabasesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ roleCode: z.coerce.number().nullish() }))
  .action(async ({ ctx, parsedInput }) => {
    return getRoleSapDatabasesByRoleCode(parsedInput.roleCode)
  })
