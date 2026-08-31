'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { isAfter, isSameDay, parse } from 'date-fns'

import { paramsSchema } from '@/schema/common'
import { itemFormSchema, syncToSapFormSchema } from '@/schema/item'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { chunkArray, safeParseFloat } from '@/utils'
import { callSapServiceLayerApi } from './sap-service-layer'
import { ITEM_MASTER_MAX_PAGE_SIZE, SAP_BASE_URL } from '@/constants/sap'
import { importFormSchema } from '@/schema/import'
import logger from '@/utils/logger'
import { getSapErrorMessage, isSapError, safeParseInt } from '@/utils'
import { createNotification } from './notification'
import { PERMISSIONS_CODES } from '@/constants/permission'
import { combineSapDateTime } from '@/utils/sap'

const COMMON_ITEM_ORDER_BY = { code: 'asc' } satisfies Prisma.ItemOrderByWithRelationInput

export async function getItems(isSynced?: boolean, excludeCodes?: number[] | null) {
  try {
    const result = await db.item.findMany({
      where: { ...(excludeCodes?.length ? { code: { notIn: excludeCodes } } : {}), ...(isSynced ? { syncStatus: 'synced' } : {}) },
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
  .schema(z.object({ isSynced: z.boolean().optional(), excludeCodes: z.array(z.coerce.number()).nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getItems(data.isSynced, data.excludeCodes)
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
          ItemCode: data.ItemCode,
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

          return item
        })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.INVENTORY,
        //   title: 'Inventory Updated',
        //   message: `An inventory (#${updatedItem.code}) was updated by ${ctx.fullName}.`,
        //   link: `/inventory/${updatedItem.code}/view`,
        //   entityType: 'Item' as Prisma.ModelName,
        //   entityCode: updatedItem.code,
        //   entityId: updatedItem.id,
        //   userCodes: [],
        // })

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
          ItemCode: data?.ItemCode.trim(),
          syncStatus: data?.syncStatus ?? 'pending',
          createdBy: userId,
          updatedBy: userId,
        },
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.INVENTORY,
      //   title: 'Inventory Created',
      //   message: `A new inventory (#${newItem.code}) was created by ${ctx.fullName}.`,
      //   link: `/inventory/${newItem.code}/view`,
      //   entityType: 'Item' as Prisma.ModelName,
      //   entityCode: newItem.code,
      //   entityId: newItem.id,
      //   userCodes: [],
      // })

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
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow, metaData } = parsedInput
    const { userId } = ctx

    const itemGroups = metaData?.itemGroups || []
    const manufacturers = metaData?.manufacturers || []

    const mfgpns = data?.map((row) => row?.['MFG_P/N'])?.filter(Boolean) || []

    try {
      const batch: Prisma.ItemCreateManyInput[] = []
      const toBeCreatedMfgpns: string[] = [] //* contains toBeCreated inventory manufacturer part numbers

      //* get existing item manufacturer part numbers
      const existingMfgpns = await db.item
        .findMany({ where: { ItemCode: { in: mfgpns } }, select: { ItemCode: true } })
        .then((items) => items.map((inv) => inv.ItemCode))

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const group = itemGroups.find((g: any) => g?.Number == row?.['Group'])
        const manufacturer = manufacturers.find((m: any) => m?.Code == row?.['Manufacturer'])

        //* check required fields
        if (!row?.['MFG_P/N']) errors.push({ field: 'MFG P/N', message: 'Missing required field' })

        //* check if manufacturer part number already exists
        if (existingMfgpns.includes(row?.['MFG_P/N']) || toBeCreatedMfgpns.includes(row?.['MFG_P/N'])) {
          errors.push({ field: 'MFG P/N', message: 'Manufacturer part number already exists' })
        }

        //* if errors array is not empty, then update/push to importErrors
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* add to be created item manufacturer part numbers
        toBeCreatedMfgpns.push(row['MFG_P/N'])

        //* reshape data
        const toCreate: Prisma.ItemCreateManyInput = {
          ItemCode: row['MFG_P/N']?.trim(),
          FirmCode: manufacturer?.Code ? safeParseInt(manufacturer?.Code) : null,
          FirmName: manufacturer?.ManufacturerName || null,
          ItmsGrpCod: group?.Number ? safeParseInt(group?.Number) : null,
          ItmsGrpNam: group?.GroupName || null,
          ItemName: row?.['Description'] || null,
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
          notes: row?.['Notes'] || null,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.item.createMany({
        data: batch,
        skipDuplicates: true,
      })

      //* progress based on rows attempted, so it always reaches 100%
      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + batch.length, //* only rows actually created
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      if (updatedStats.status === 'completed') {
        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.INVENTORY,
        //   title: 'Inventory Imported',
        //   message: `A new inventor${total > 1 ? 'ies were' : 'y was'} imported by ${ctx.fullName}.`,
        //   link: `/inventory`,
        //   entityType: 'Item' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} item master created successfully!`,
        action: 'IMPORT_ITEMS',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data import error:', error)

      const errors = data.map((row) => ({
        rowNumber: row.rowNumber as number,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row: null,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'IMPORT_ITEMS',
        stats,
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

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.INVENTORY,
      //   title: 'Inventory Deleted',
      //   message: `An inventory (#${item.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/inventory/${item.code}/view`,
      //   entityType: 'Item' as Prisma.ModelName,
      //   entityCode: item.code,
      //   entityId: item.id,
      //   userCodes: [],
      // })

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

export const restoreItem = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const item = await db.item.findUnique({ where: { code: data.code } })

      if (!item) return { error: true, status: 404, message: 'Item not found!', action: 'RESTORE_ITEM' }

      await db.item.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.INVENTORY,
      //   title: 'Inventory Restored',
      //   message: `An inventory (#${item.code}) was restored by ${ctx.fullName}.`,
      //   link: `/inventory/${item.code}/view`,
      //   entityType: 'Item' as Prisma.ModelName,
      //   entityCode: item.code,
      //   entityId: item.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Item retored successfully!', action: 'RESTORE_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_ITEM',
      }
    }
  })

export async function getItemMasterByItemCode(itemCode: string, isSynced?: boolean) {
  if (!itemCode || !isSynced) return null

  try {
    const response = (await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Items?$filter=ItemCode eq '${itemCode}'` })) as {
      value?: any[]
    } | null

    return response?.value?.[0] ?? null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getItemMasterCount() {
  try {
    const totalCount = await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Items/$count?$filter=U_Portal_Sync eq 'Y'` })
    return safeParseInt(totalCount)
  } catch (error) {
    console.log({ error })
    logger.error(error, 'Failed to fetch item master count from SAP')
    return 0
  }
}

export async function getItemMasterByPage(page: number) {
  try {
    const skip = page * ITEM_MASTER_MAX_PAGE_SIZE //* offset

    //* create request
    const req = (await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/$crossjoin(Items,ItemGroups,Manufacturers)?$expand=Items($select=ItemCode,ItemName,ItemsGroupCode,Manufacturer,ManageBatchNumbers,PurchaseItemsPerUnit,U_MPN,U_MSL,CreateDate,CreateTime,UpdateDate,UpdateTime,U_Portal_Sync),ItemGroups($select=Number,GroupName),Manufacturers($select=Code,ManufacturerName)&$filter=Items/ItemsGroupCode eq ItemGroups/Number and Items/Manufacturer eq Manufacturers/Code and Items/U_Portal_Sync eq 'Y'&$skip=${skip}&$orderby=ItemCode asc`,
      headers: { Prefer: `odata.maxpagesize=${ITEM_MASTER_MAX_PAGE_SIZE}` },
    })) as { value?: any[] } | null

    return (req?.value || []).filter(Boolean)
  } catch (error) {
    console.log({ error })
    logger.error(error, `Failed to fetch item master from SAP: Page (${page})`)
    return []
  }
}

export const syncToSap = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow } = parsedInput
    const { userId } = ctx

    const toUpdateSyncStatus: number[] = []

    try {
      const sapBatch: { rowNumber: number; code: number; promise: Promise<any>; row: Record<string, any> }[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]
        const rowNumber = stats.completed + i + 1 //* global row number across chunks

        //* check required fields
        if (!row?.ItemCode) errors.push({ field: 'MFG P/N', message: 'Missing required field' })

        if (!row?.ItemsGroupCode) errors.push({ field: 'Group', message: 'Missing required field' })

        if (!row?.Manufacturer) errors.push({ field: 'Manufacturer', message: 'Missing required field' })

        if (!row?.ItemName) errors.push({ field: 'Description', message: 'Missing required field' })

        //* if errors present, push to stats.errors and skip
        if (errors.length > 0) {
          stats.errors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        const toCreate = {
          ItemCode: row?.ItemCode,
          Manufacturer: row?.Manufacturer,
          ItemsGroupCode: row?.ItemsGroupCode,
          ItemName: row?.ItemName,
          U_Portal_Sync: 'Y',
        }

        //* push the batch item to the sapBatch array
        sapBatch.push({
          rowNumber,
          code: row?.code,
          promise: callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Items`, method: 'post', data: toCreate }),
          row,
        })
      }

      //* create items into sap
      const sapCreated = await Promise.all(sapBatch.map((b) => b.promise))

      //* populate error if any related to sap, otherwise collect success codes
      for (let i = 0; i < sapCreated.length; i++) {
        const batchItem = sapBatch[i] //* sapCreated and sapBatch have the same order

        //* if error present means there's an error when creating in sap
        if (isSapError(sapCreated[i])) {
          //* find existing stats error related to the batch item's code
          const importSyncError = stats.errors.find((e) => e?.code === batchItem?.code)

          //* update the error if there existing importSyncError otherwise create a new one
          if (importSyncError) {
            importSyncError.entries.push({
              field: 'SAP Error',
              message: getSapErrorMessage(sapCreated[i]),
            })
          } else {
            stats.errors.push({
              rowNumber: batchItem.rowNumber,
              entries: [{ field: 'SAP Error', message: getSapErrorMessage(sapCreated[i]) }],
              row: batchItem.row,
              code: batchItem.code,
            })
          }

          continue
        }

        //* only codes that did not encounter a sap error are added
        toUpdateSyncStatus.push(batchItem.code)
      }

      //* update the sync status of the items created in sap
      await db.item.updateMany({
        where: { code: { in: toUpdateSyncStatus } },
        data: { syncStatus: 'synced', updatedBy: userId },
      })

      //* progress based on items processed (attempted) this chunk
      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + toUpdateSyncStatus.length, //* only items successfully created in SAP
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      //* create notification only when the whole sync is completed
      // if (updatedStats.status === 'completed') {
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES.INVENTORY,
      //     title: 'Inventories Synced To SAP',
      //     message: `${updatedStats.completed - updatedStats.errors.length} of ${total} inventor${total > 1 ? 'ies were' : 'y was'} synced into SAP by ${ctx.fullName}. ${updatedStats.errors.length} error${updatedStats.errors.length > 1 ? 's' : ''} found.`,
      //     link: `/inventory`,
      //     entityType: 'Item' as Prisma.ModelName,
      //     userCodes: [],
      //   })
      // }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} items synced into SAP. ${updatedStats.errors.length} errors found.`,
        action: 'SYNC_TO_SAP',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = data.map((row, index) => ({
        rowNumber: stats.completed + index + 1,
        code: row?.code,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data sync error!',
        action: 'SYNC_TO_SAP',
        stats,
      }
    }
  })

export const syncFromSap = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow } = parsedInput
    const { userId } = ctx

    const SYNC_META_CODE = 'item'

    try {
      //* get last sync date
      const syncMeta = await db.syncMeta.findUnique({ where: { code: SYNC_META_CODE } })
      const lastSyncDate = syncMeta?.lastSyncAt || new Date('01/01/2020')

      const batch: Prisma.ItemUncheckedCreateInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]
        const rowNumber = stats.completed + i + 1 //* global row number across pages

        const item = row?.Items
        const itemGroup = row?.ItemGroups
        const manufacturer = row?.Manufacturers

        //* skip (not an error): not created/updated since last sync
        const createDateTime = combineSapDateTime(item?.CreateDate, item?.CreateTime)
        const updateDateTime = combineSapDateTime(item?.UpdateDate, item?.UpdateTime)

        const isCreateDateTimeSameDay = createDateTime ? isSameDay(createDateTime, lastSyncDate) : false
        const isUpdateDateTimeSameDay = updateDateTime ? isSameDay(updateDateTime, lastSyncDate) : false
        const isCreateDateTimeAfter = createDateTime ? isAfter(createDateTime, lastSyncDate) : false
        const isUpdateDateTimeAfter = updateDateTime ? isAfter(updateDateTime, lastSyncDate) : false

        if (!(isCreateDateTimeSameDay || isUpdateDateTimeSameDay || isCreateDateTimeAfter || isUpdateDateTimeAfter)) continue

        //* check required fields
        if (!item || !item?.ItemCode) errors.push({ field: 'ItemCode', message: 'Missing required field' })

        //* if errors array is not empty, then update/push to stats.errors
        if (errors.length > 0) {
          stats.errors.push({ rowNumber, entries: errors, row: item, code: item?.ItemCode, name: item?.ItemName })
          continue
        }

        //* reshape data
        batch.push({
          syncStatus: 'synced',

          //* sap fields
          ItemCode: item.ItemCode,
          ItemName: item?.ItemName || '',
          ItmsGrpCod: itemGroup?.Number || -1,
          ItmsGrpNam: itemGroup?.GroupName || '',
          FirmCode: manufacturer?.Code || -1,
          FirmName: manufacturer?.ManufacturerName || '',
        })
      }

      //* commit the batch, single transaction since data is already paged (max 1 page per call)
      await db.$transaction(async (tx) => {
        await Promise.all(
          batch.map((itemData) =>
            tx.item.upsert({
              where: { ItemCode: itemData.ItemCode },
              create: { ...itemData, createdBy: userId, updatedBy: userId },
              update: { ...itemData, updatedBy: userId },
            })
          )
        )
      })

      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + batch.length, //* only rows actually upserted (excludes skipped/errored)
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      //* upsert sync meta only when the whole sync is completed
      if (updatedStats.status === 'completed') {
        await db.syncMeta.upsert({
          where: { code: SYNC_META_CODE },
          create: { code: SYNC_META_CODE, description: 'Last item master synced date', lastSyncAt: new Date() },
          update: { code: SYNC_META_CODE, description: 'Last item master synced date', lastSyncAt: new Date() },
        })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.INVENTORY,
        //   title: 'Invetories Synced From SAP',
        //   message: `Inventor${total > 1 ? 'ies were' : 'y was'} synced from SAP by ${ctx.fullName}.`,
        //   link: `/inventory`,
        //   entityType: 'Item' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} item master synced. ${updatedStats.errors.length} errors found.`,
        action: 'SYNC_FROM_SAP',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = data.map((row: any) => ({
        rowNumber: row?.rowNumber as number,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row: null,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data sync error!',
        action: 'SYNC_FROM_SAP',
        stats,
      }
    }
  })
