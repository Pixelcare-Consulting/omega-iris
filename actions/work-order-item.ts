'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'

export async function getWoItemsByWoCode(dbCode: string, workOrderCode?: number | number[] | null) {
  if (!workOrderCode) return []

  try {
    if (Array.isArray(workOrderCode)) {
      return db.workOrderItem.findMany({
        where: { dbCode, workOrderCode: { in: workOrderCode } },
        include: { projectItem: { include: { item: true, dateReceivedByUser: { select: { fname: true, lname: true } } } } },
      })
    }

    return db.workOrderItem.findMany({
      where: { dbCode, workOrderCode },
      include: { projectItem: { include: { item: true, dateReceivedByUser: { select: { fname: true, lname: true } } } } },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWoItemsByWoCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ workOrderCode: z.union([z.coerce.number().nullish(), z.array(z.coerce.number())]) }))
  .action(async ({ ctx, parsedInput }) => {
    return getWoItemsByWoCode(ctx.dbCode, parsedInput.workOrderCode)
  })
