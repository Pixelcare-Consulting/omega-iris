'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getWoItemsByWoCode(workOrderCode?: number | number[] | null) {
  if (!workOrderCode) return []

  try {
    if (Array.isArray(workOrderCode)) {
      return db.workOrderItem.findMany({
        where: { workOrderCode: { in: workOrderCode } },
        include: { projectItem: { include: { item: true, dateReceivedByUser: { select: { fname: true, lname: true } } } } },
      })
    }

    return db.workOrderItem.findMany({
      where: { workOrderCode },
      include: { projectItem: { include: { item: true, dateReceivedByUser: { select: { fname: true, lname: true } } } } },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWoItemsByWoCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ workOrderCode: z.union([z.coerce.number().nullish(), z.array(z.coerce.number())]) }))
  .action(async ({ parsedInput }) => {
    return getWoItemsByWoCode(parsedInput.workOrderCode)
  })
