'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getWoItemsByWoCode(workOrderCode?: number | null) {
  if (!workOrderCode) return []

  try {
    return db.workOrderItem.findMany({
      where: { workOrderCode },
      include: { projectItem: { include: { item: true, warehouse: true, dateReceivedByUser: { select: { fname: true, lname: true } } } } },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWoItemsByWoCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ workOrderCode: z.coerce.number().nullish() }))
  .action(async ({ parsedInput }) => {
    return getWoItemsByWoCode(parsedInput.workOrderCode)
  })
