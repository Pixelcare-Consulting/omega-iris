'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getWarehouseInventoriesByItemCode(itemCode?: number) {
  if (!itemCode) return []

  try {
    return await db.warehouseInventory.findMany({ where: { inventoryCode: itemCode }, include: { warehouse: true } })
  } catch (error) {
    return []
  }
}

export const getWarehouseInventoriesByItemCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ itemCode: z.number().optional() }))
  .action(async ({ ctx, parsedInput }) => {
    return getWarehouseInventoriesByItemCode(parsedInput.itemCode)
  })
