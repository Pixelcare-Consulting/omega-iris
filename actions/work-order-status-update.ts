'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'

const COMMON_WORK_ORDER_UPDATE_STATUS_ORDER_BY = { code: 'desc' } satisfies Prisma.WorkOrderStatusUpdateOrderByWithRelationInput

export async function getWoStatusUpdatesByWoCode(dbCode: string, workOrderCode?: number | null) {
  if (!workOrderCode) return []

  try {
    return db.workOrderStatusUpdate.findMany({
      where: { dbCode, workOrderCode },
      orderBy: COMMON_WORK_ORDER_UPDATE_STATUS_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWoStatusUpdatesByWoCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ workOrderCode: z.coerce.number().nullish() }))
  .action(async ({ ctx, parsedInput }) => {
    return getWoStatusUpdatesByWoCode(ctx.dbCode, parsedInput.workOrderCode)
  })
