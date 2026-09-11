'use server'

import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { getSapDatabasesForRole } from '@/utils/sap-database-access'
import { getSapServiceLayerToken } from './sap-auth'

const COMMON_SAP_DATABASE_WHERE = { isActive: true } satisfies Prisma.SapDatabaseWhereInput

const COMMON_SAP_DATABASE_ORDER_BY = [{ order: 'asc' }, { name: 'asc' }] satisfies Prisma.SapDatabaseOrderByWithRelationInput[]

export async function getSapDatabases() {
  try {
    return db.sapDatabase.findMany({ where: COMMON_SAP_DATABASE_WHERE, orderBy: COMMON_SAP_DATABASE_ORDER_BY })
  } catch (error) {
    console.error(error)
    return []
  }
}

//* databases a role may use, admin always gets all of them
export async function getSapDatabasesByRoleCode(roleCode?: number | null) {
  return getSapDatabasesForRole(roleCode)
}

export const getSapDatabasesClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getSapDatabasesByRoleCode(ctx.roleCode)
})

//* opens or reuses the shared session for a database, so an unreachable one is caught before it is chosen
export const verifySapDatabaseConnection = action
  .use(authenticationMiddleware)
  .schema(z.object({ dbCode: z.string().min(1) }))
  .action(async ({ parsedInput: { dbCode } }) => {
    const response = await getSapServiceLayerToken(dbCode)
    const sapSession = response?.data?.sapSession

    if (response.error || !sapSession?.b1session || !sapSession?.routeid) {
      return {
        error: true,
        status: 502,
        message: response.message || 'Could not connect to SAP with this database.',
        action: 'VERIFY_SAP_DATABASE_CONNECTION',
      }
    }

    return { status: 200, message: 'SAP connection successful', action: 'VERIFY_SAP_DATABASE_CONNECTION' }
  })
