'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_ITEM_WAREHOUSE_INVENTORY_ORDER_BY = { code: 'asc' } satisfies Prisma.ItemWarehouseInventoryOrderByWithRelationInput
const COMMON_ITEM_WAREHOUSE_INVENTORY_INCLUDE = { warehouse: true } satisfies Prisma.ItemWarehouseInventoryInclude

export async function getItemWarehouseInventoryByItemCode(itemCode?: number) {
  if (!itemCode) return []

  try {
    return db.itemWarehouseInventory.findMany({
      where: { itemCode: itemCode },
      include: COMMON_ITEM_WAREHOUSE_INVENTORY_INCLUDE,
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
