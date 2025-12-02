'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { warehouseFormSchema } from '@/schema/warehouse'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_WAREHOUSE_ORDER_BY = { code: 'asc' } satisfies Prisma.WarehouseOrderByWithRelationInput

export async function getWarehouses(isDefault?: boolean | null) {
  try {
    return await db.warehouse.findMany({
      where: { deletedAt: null, deletedBy: null, ...(isDefault ? { isDefault } : {}) },
      orderBy: COMMON_WAREHOUSE_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWarehousesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ isDefault: z.boolean().nullish().default(false) }))
  .action(async ({ parsedInput }) => {
    return getWarehouses(parsedInput.isDefault)
  })

export async function getWarehouseByCode(code: number) {
  if (!code) return null

  try {
    return await db.warehouse.findUnique({ where: { code } })
  } catch (err) {
    return null
  }
}

export const upsertWarehouse = action
  .use(authenticationMiddleware)
  .schema(warehouseFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update warehouse
      if (code !== -1) {
        const updatedWarehouse = await db.warehouse.update({ where: { code }, data: { ...data, updatedBy: userId } })

        return {
          status: 200,
          message: 'Warehouse updated successfully!',
          action: 'UPSERT_WAREHOUSE',
          data: { warehouse: updatedWarehouse },
        }
      }

      //* create warehouse
      const newWarehouse = await db.warehouse.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      return {
        status: 200,
        message: 'Warehouse created successfully!',
        action: 'UPSERT_WAREHOUSE',
        data: { warehouse: newWarehouse },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_WAREHOUSE',
      }
    }
  })

export const deleleteWarehouse = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const warehouse = await db.warehouse.findUnique({ where: { code: data.code } })

      if (!warehouse) return { error: true, status: 404, message: 'Warehouse not found', action: 'DELETE_WAREHOUSE' }

      await db.warehouse.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Warehouse deleted successfully!', action: 'DELETE_WAREHOUSE' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_WAREHOUSE',
      }
    }
  })
