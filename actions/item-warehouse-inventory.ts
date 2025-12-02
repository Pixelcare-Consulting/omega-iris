'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getItemWarehouseInventoryByItemCode(itemCode?: number) {
  if (!itemCode) return []

  try {
    return await db.itemWarehouseInventory.findMany({ where: { itemCode: itemCode }, include: { warehouse: true } })
  } catch (error) {
    return []
  }
}

export const getItemWarehouseInventoryByItemCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ itemCode: z.number().optional() }))
  .action(async ({ parsedInput }) => {
    return getItemWarehouseInventoryByItemCode(parsedInput.itemCode)
  })
