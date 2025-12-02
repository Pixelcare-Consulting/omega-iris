'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { itemFormSchema } from '@/schema/item'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportError, ImportErrorEntry } from '@/types/common'
import { safeParseFloat } from '@/utils'

const COMMON_ITEM_ORDER_BY = { code: 'asc' } satisfies Prisma.ItemOrderByWithRelationInput

export async function getItems(excludeCodes?: number[] | null) {
  try {
    const result = await db.item.findMany({
      where: { deletedAt: null, deletedBy: null, ...(excludeCodes?.length ? { code: { notIn: excludeCodes } } : {}) },
      orderBy: COMMON_ITEM_ORDER_BY,
    })

    const normalizedResult = result.map((item) => ({
      ...item,
      Price: safeParseFloat(item.Price),
    }))

    return normalizedResult as typeof normalizedResult
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getItemsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ excludeCodes: z.array(z.coerce.number()).nullish() }))
  .action(async ({ parsedInput: data }) => {
    return await getItems(data.excludeCodes)
  })

export async function getItemByCode(code: number) {
  if (!code) return null

  try {
    const result = await db.item.findUnique({ where: { code } })

    if (!result) return null

    const normalizedResult = {
      ...result,
      Price: safeParseFloat(result.Price),
    }

    return normalizedResult
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertItem = action
  .use(authenticationMiddleware)
  .schema(itemFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, warehouseInventory, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingItem = await db.item.findFirst({
        where: {
          manufacturerPartNumber: data.manufacturerPartNumber,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingItem) return { error: true, status: 401, message: 'MFG P/N already exists!', action: 'UPSERT_ITEM' }

      //* update item
      if (code !== -1) {
        const updatedItem = await db.$transaction(async (tx) => {
          //* update item
          const item = await tx.item.update({ where: { code }, data: { ...data, updatedBy: userId } })

          if (warehouseInventory.length > 0) {
            //* upsert item warehouse inventory
            await Promise.all(
              warehouseInventory.map(({ name: warehouseName, code: warehouseCode, ...wi }) => {
                return tx.itemWarehouseInventory.upsert({
                  where: {
                    warehouseCode_itemCode: {
                      warehouseCode: warehouseCode,
                      itemCode: code,
                    },
                  },
                  create: {
                    warehouseCode: warehouseCode,
                    itemCode: code,
                    ...wi,
                    createdBy: userId,
                    updatedBy: userId,
                  },
                  update: { ...wi, updatedBy: userId },
                })
              })
            )
          }

          return item
        })

        return {
          status: 200,
          message: 'Item updated successfully!',
          action: 'UPSERT_ITEM',
          data: { item: updatedItem },
        }
      }

      //* create item
      const newItem = await db.item.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          itemWarehouseInventory: {
            createMany: {
              data: warehouseInventory.map(({ name, code: warehouseCode, ...wi }) => ({
                warehouseCode,
                ...wi,
                createdBy: userId,
                updatedBy: userId,
              })),
            },
          },
        },
      })

      return {
        status: 200,
        message: 'Item created successfully!',
        action: 'UPSERT_ITEM',
        data: { item: newItem },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_ITEM',
      }
    }
  })

export const importItems = action
  .use(authenticationMiddleware)
  .schema(z.object({ data: z.array(z.record(z.string(), z.any())) }))
  .action(async ({ ctx, parsedInput }) => {
    const { data } = parsedInput
    const { userId } = ctx

    const importErrors: ImportError[] = []
    const mfgpns = data?.map((row) => row?.['MFG_P/N'])?.filter(Boolean) || []

    try {
      const batch: Prisma.InventoryCreateManyInput[] = []
      const toBeCreatedMfgpns: string[] = [] //* contains toBeCreated inventory manufacturer part numbers

      //* get existing item manufacturer part numbers
      const existingMfgpns = (
        await db.item.findMany({ where: { manufacturerPartNumber: { in: mfgpns } }, select: { manufacturerPartNumber: true } })
      ).map((inv) => inv.manufacturerPartNumber)

      for (let i = 0; i < data.length; i++) {
        const errors: ImportErrorEntry[] = []
        const row = data[i]

        //* check required fields
        if (!row?.['MFG_P/N']) errors.push({ field: 'MFG_P/N', message: 'Missing required fields' })

        //* check if manufacturer part number already exists
        if (existingMfgpns.includes(row?.['MFG_P/N']) || toBeCreatedMfgpns.includes(row?.['MFG_P/N'])) {
          errors.push({ field: 'MFG_P/N', message: 'Manufacturer part number already exists' })
        }

        //* if errors array is not empty, then update/push to importErrors
        if (errors.length > 0) {
          importErrors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* add to be created item manufacturer part numbers
        toBeCreatedMfgpns.push(row['MFG_P/N'])

        //* reshape data
        const toCreate: Prisma.ItemCreateManyInput = {
          manufacturerPartNumber: row['MFG_P/N'],
          manufacturer: row?.['Manufacturer'] || null,
          description: row?.['Description'] || null,
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      const created = await db.item.createManyAndReturn({
        data: batch,
        skipDuplicates: true,
      })

      return {
        status: 200,
        message: `Inventory items imported successfully!. ${created.length}/${data.length} items created. ${importErrors.length} errors found.`,
        action: 'IMPORT_ITEMS',
        errors: importErrors,
      }
    } catch (error) {
      console.error('Data import error:', error)

      const errors = data.map((row) => ({
        rowNumber: row.rowNumber,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
      }))

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'IMPORT_ITEMS',
        errors,
      }
    }
  })

export const deleteItem = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const item = await db.item.findUnique({ where: { code: data.code } })

      if (!item) return { error: true, status: 404, message: 'Item not found', action: 'DELETE_ITEM' }

      await db.item.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Item deleted successfully!', action: 'DELETE_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_ITEM',
      }
    }
  })
