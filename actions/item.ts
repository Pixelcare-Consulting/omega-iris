'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { isAfter, parse } from 'date-fns'

import { paramsSchema } from '@/schema/common'
import { itemFormSchema, syncToSapFormSchema } from '@/schema/item'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { safeParseFloat } from '@/utils'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

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
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingItem = await db.item.findFirst({
        where: {
          manufacturerPartNumber: data.manufacturerPartNumber,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingItem) return { error: true, status: 401, message: 'MFG P/N already exists!', action: 'UPSERT_ITEM' }

      if (code !== -1) {
        const updatedItem = await db.$transaction(async (tx) => {
          //* update item
          const item = await tx.item.update({
            where: { code },
            data: { ...data, syncStatus: data?.syncStatus ?? 'pending', updatedBy: userId },
          })

          // if (warehouseInventory.length > 0) {
          //   //* upsert item warehouse inventory
          //   await Promise.all(
          //     warehouseInventory.map(({ name: warehouseName, code: warehouseCode, ...wi }) => {
          //       return tx.itemWarehouseInventory.upsert({
          //         where: {
          //           warehouseCode_itemCode: {
          //             warehouseCode: warehouseCode,
          //             itemCode: code,
          //           },
          //         },
          //         create: {
          //           warehouseCode: warehouseCode,
          //           itemCode: code,
          //           ...wi,
          //           createdBy: userId,
          //           updatedBy: userId,
          //         },
          //         update: { ...wi, updatedBy: userId },
          //       })
          //     })
          //   )
          // }

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
          syncStatus: data?.syncStatus ?? 'pending',
          createdBy: userId,
          updatedBy: userId,
          // itemWarehouseInventory: {
          //   createMany: {
          //     data: warehouseInventory.map(({ name, code: warehouseCode, ...wi }) => ({
          //       warehouseCode,
          //       ...wi,
          //       createdBy: userId,
          //       updatedBy: userId,
          //     })),
          //   },
          // },
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

    const importErrors: ImportSyncError[] = []
    const mfgpns = data?.map((row) => row?.['MFG_P/N'])?.filter(Boolean) || []

    try {
      const batch: Prisma.ItemCreateManyInput[] = []
      const toBeCreatedMfgpns: string[] = [] //* contains toBeCreated inventory manufacturer part numbers

      //* get existing item manufacturer part numbers
      const existingMfgpns = (
        await db.item.findMany({ where: { manufacturerPartNumber: { in: mfgpns } }, select: { manufacturerPartNumber: true } })
      ).map((inv) => inv.manufacturerPartNumber)

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
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

      if (!item) return { error: true, status: 404, message: 'Item not found!', action: 'DELETE_ITEM' }

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

export const syncToSap = action
  .use(authenticationMiddleware)
  .schema(syncToSapFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { items } = parsedInput
    const { userId } = ctx

    const importSyncErrors: ImportSyncError[] = []
    const toUpdateSyncStatus: number[] = []

    try {
      const sapBatch: { rowNumber: number; code: number; promise: Promise<any>; row: Record<string, any> }[] = []

      for (let i = 0; i < items.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = items[i]
        const rowNumber = i + 1

        //* check required fields
        if (!row?.['ItemCode']) errors.push({ field: 'MFG_P/N', message: 'Missing required fields' })

        if (!row?.['ItemsGroupCode']) errors.push({ field: 'Group', message: 'Missing required fields' })

        if (!row?.['Manufacturer']) errors.push({ field: 'Manufacturer', message: 'Missing required fields' })

        if (!row?.['ItemName']) errors.push({ field: 'Description', message: 'Missing required fields' })

        //* if errors array is not empty, then update/push to ImportSyncError
        if (errors.length > 0) {
          importSyncErrors.push({ rowNumber, entries: errors, row, code: row?.['code'] })
          continue
        }

        const toCreate = {
          ItemCode: row['ItemCode'],
          Manufacturer: row['Manufacturer'],
          ItemsGroupCode: row['ItemsGroupCode'],
          ItemName: row['ItemName'],
        }

        //* push the batch item to the sapBatch array
        sapBatch.push({
          rowNumber,
          code: row['code'],
          promise: callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Items`, method: 'post', data: toCreate }),
          row,
        })
      }

      //* create items into sap
      const sapCreated = await Promise.all(sapBatch.map((b) => b.promise))

      //* populate error if any related to sap
      for (let i = 0; i < sapCreated.length; i++) {
        const batchItem = sapBatch[i] //* sapCreated and sapBatch has the same order

        //* if error present means there's error when creating in sap
        if (sapCreated[i].error) {
          //* find the import error related to the batch items code
          const importError = importSyncErrors.find((e) => e?.code === batchItem?.code)

          //* update the error if there existing import error otherwise create a new one
          if (importError) {
            importError.entries.push({
              field: 'SAP Error',
              message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error',
            })
          } else {
            importSyncErrors.push({
              rowNumber: batchItem.rowNumber,
              entries: [{ field: 'SAP Error', message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error' }],
              row: batchItem.row,
              code: batchItem.code,
            })
          }

          continue
        }

        //* add code to the toUpdateSyncStatus array, only the code will be added that does not encountered any error in sap creation
        toUpdateSyncStatus.push(batchItem.code)
      }

      //* update the sync status of the items who created in sap
      await db.item.updateMany({
        where: { code: { in: toUpdateSyncStatus } },
        data: { syncStatus: 'synced', updatedBy: userId },
      })

      const completed = sapCreated?.filter((sc) => !sc?.error)

      return {
        status: 200,
        message: `Inventory items sync successfully!. ${completed.length}/${items.length} items created into SAP. ${importSyncErrors.length} errors found.`,
        action: 'SYNC_TO_SAP',
        errors: importSyncErrors,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = items.map((row, index) => ({
        rowNumber: index + 1,
        code: row.code,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row,
      }))

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'SYNC_TO_SAP',
        errors,
      }
    }
  })

export const syncFromSap = action.use(authenticationMiddleware).action(async ({ ctx, parsedInput }) => {
  const { userId } = ctx

  const SYNC_META_CODE = 'item'

  try {
    //* fetch all item master from sap
    const data = await Promise.allSettled([
      callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query2')/List`, headers: { Prefer: 'odata.maxpagesize=50' } }),
      db.syncMeta.findUnique({ where: { code: 'item' } }),
    ])

    const itemMaster = data[0].status === 'fulfilled' ? data[0]?.value?.value || [] : []
    const lastSyncDate = data[1].status === 'fulfilled' ? data[1]?.value?.lastSyncAt || new Date('01/01/2020') : new Date('01/01/2020')

    if (itemMaster.length < 1) {
      return {
        error: true,
        status: 404,
        message: 'Failed to fetch item master from SAP!',
        action: 'SYNC_FROM_SAP',
      }
    }

    //* do an upsert operation
    //*  filter the records where CreateDate > lastSyncDate or  UpdateDate > lastSyncDate
    const filteredSapItemMasters =
      itemMaster?.filter((row: any) => {
        const createDate = parse(row.CreateDate, 'yyyyMMdd', new Date())
        const updateDate = parse(row.UpdateDate, 'yyyyMMdd', new Date())
        return isAfter(createDate, lastSyncDate) || isAfter(updateDate, lastSyncDate)
      }) || []

    const getUpsertPromises = (filteredSapItemMasters: Record<string, any>[], tx: any) => {
      return filteredSapItemMasters.map((row: any) => {
        const itemData = {
          manufacturerPartNumber: row?.ItemCode,
          manufacturer: row?.FirmName || '',
          description: row?.ItemName || '',
          syncStatus: 'synced',
          createdBy: userId,
          updatedBy: userId,

          //* sap fields
          ItemCode: row?.ItemCode || '',
          ItemName: row?.ItemName || '',
          ItmsGrpCod: row?.ItmsGrpCod || -1,
          ItmsGrpNam: row?.ItmsGrpNam || '',
          FirmCode: row?.FirmCode || -1,
          FirmName: row?.FirmName || '',
        }

        return tx.item.upsert({
          where: { manufacturerPartNumber: itemData.manufacturerPartNumber }, //* if manufacturerPartNumber will be remove based it on the ItemCode
          create: itemData,
          update: itemData,
        })
      })
    }

    //* perform upsert and  update the sync meta
    await db.$transaction(async (tx) => {
      //* upsert items
      await Promise.all(getUpsertPromises(filteredSapItemMasters, tx))

      //* upsert sync meta
      await tx.syncMeta.upsert({
        where: { code: SYNC_META_CODE },
        create: { code: SYNC_META_CODE, description: 'Last item master synced date', lastSyncAt: new Date() },
        update: { code: SYNC_META_CODE, description: 'Last synced date', lastSyncAt: new Date() },
      })
    })

    return {
      status: 200,
      message: 'Inventory items sync successfully!',
      action: 'SYNC_FROM_SAP',
    }
  } catch (error) {
    console.error(error)

    return {
      error: true,
      status: 500,
      message: error instanceof Error ? error.message : 'Something went wrong!',
      action: 'SYNC_FROM_SAP',
    }
  }
})
