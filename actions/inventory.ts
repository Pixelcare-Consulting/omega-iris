'use server'

import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { inventoryFormSchema } from '@/schema/inventory'
import { safeParseFloat } from '@/utils'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_INVENTORY_INCLUDE = {
  user: { select: { code: true, fname: true, lname: true } },
  projectIndividual: { select: { code: true, name: true } },
} satisfies Prisma.InventoryInclude

export async function getInventories() {
  try {
    const result = await db.inventory.findMany({
      where: { deletedAt: null, deletedBy: null },
      include: COMMON_INVENTORY_INCLUDE,
    })

    const normalizedResult = result.map((inv) => ({
      ...inv,
      cost: safeParseFloat(inv.cost),
    }))

    return normalizedResult
  } catch (error) {
    return []
  }
}

export async function getInventoryByCode(code: number) {
  if (!code) return null

  try {
    const result = await db.inventory.findUnique({
      where: { code },
      include: COMMON_INVENTORY_INCLUDE,
    })

    if (!result) return null

    const normalizedResult = {
      ...result,
      cost: safeParseFloat(result.cost),
    }

    return normalizedResult
  } catch (err) {
    return null
  }
}

export const upsertInventory = action
  .use(authenticationMiddleware)
  .schema(inventoryFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingInventory = await db.inventory.findFirst({
        where: {
          partNumber: data.partNumber,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingInventory) return { error: true, code: 401, message: 'Part number already exists!', action: 'UPSERT_INVENTORY' }

      //* update inventory
      if (code !== -1) {
        const updatedInventory = await db.inventory.update({ where: { code }, data: { ...data, updatedBy: userId } })

        return {
          status: 200,
          message: 'Inventory updated successfully!',
          action: 'UPSERT_INVENTORY',
          data: { inventory: updatedInventory },
        }
      }

      //* create inventory
      const newInventory = await db.inventory.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      return {
        status: 200,
        message: 'Inventory created successfully!',
        action: 'UPSERT_INVENTORY',
        data: { inventory: newInventory },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_INVENTORY',
      }
    }
  })

export const deleteInventory = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const inventory = await db.inventory.findUnique({ where: { code: data.code } })

      if (!inventory) return { error: true, code: 404, message: 'Inventory not found', action: 'DELETE_INVENTORY' }

      await db.inventory.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Inventory deleted successfully!', action: 'DELETE_INVENTORY' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_INVENTORY',
      }
    }
  })
