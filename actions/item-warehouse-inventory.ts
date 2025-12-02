'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_ITEM_WAREHOUSE_INVENTORY_ORDER_BY = { code: 'asc' } satisfies Prisma.ItemWarehouseInventoryOrderByWithRelationInput

export async function getItemWarehouseInventoryByItemCode(itemCode?: number) {
  if (!itemCode) return []

  try {
    return await db.itemWarehouseInventory.findMany({
      where: { itemCode: itemCode },
      include: { warehouse: true },
      orderBy: COMMON_ITEM_WAREHOUSE_INVENTORY_ORDER_BY,
    })
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
