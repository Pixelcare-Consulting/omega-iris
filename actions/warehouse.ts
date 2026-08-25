'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { isAfter, isSameDay } from 'date-fns'

import { paramsSchema } from '@/schema/common'
import { whBinLocationFormSchema, warehouseFormSchema } from '@/schema/warehouse'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { DuplicateFields, ImportSyncErrorEntry } from '@/types/common'
import { capitalize } from 'radash'
import { createNotification } from './notification'
import { PERMISSIONS_CODES } from '@/constants/permission'
import { importFormSchema } from '@/schema/import'
import { callSapServiceLayerApi } from './sap-service-layer'
import { getMasterBinLocations, getWarehouseBinLocations } from './warehouse-bin-location'
import { SAP_BASE_URL, WAREHOUSE_MASTER_MAX_PAGE_SIZE } from '@/constants/sap'
import { parseSapCompactDate } from '@/utils/sap'
import { getSapErrorMessage, isSapError, safeParseInt } from '@/utils'
import logger from '@/utils/logger'

const COMMON_WAREHOUSE_ORDER_BY = { code: 'asc' } satisfies Prisma.WarehouseOrderByWithRelationInput

export async function getWarehouses() {
  try {
    return db.warehouse.findMany({
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
  .action(async () => {
    return getWarehouses()
  })

export async function getWarehouseByCode(code: number) {
  if (!code) return null

  try {
    return db.warehouse.findUnique({ where: { code } })
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

    const trimmedWarehouseCode = data?.WarehouseCode?.trim()
    const trimmedWarehouseName = data?.WarehouseName?.trim()

    try {
      const [existingWarehouseCode, existingWarehouseName] = await Promise.all([
        db.warehouse.findFirst({ where: { WarehouseCode: trimmedWarehouseCode, ...(code && code !== -1 && { code: { not: code } }) } }),
        db.warehouse.findFirst({ where: { WarehouseName: trimmedWarehouseName, ...(code && code !== -1 && { code: { not: code } }) } }),
      ])

      const duplicates: DuplicateFields = []

      if(existingWarehouseCode) duplicates.push({ field: 'WarehouseCode', name: 'Code',  message: 'code already exists!' }) // prettier-ignore
      if(existingWarehouseName) duplicates.push({ field: 'WarehouseName', name: 'Name', message: 'name already exists!' }) // prettier-ignore

      if (duplicates.length > 0) {
        const paths = duplicates.map((d) => ({ field: d.field, message: d.message }))
        const message = duplicates.map((d) => d.name).join(', ')
        return { error: true, status: 401, message: `${capitalize(message)} already exists!`, action: 'UPSERT_WAREHOUSE', paths }
      }

      //* update warehouse
      if (code !== -1) {
        const updatedWarehouse = await db.warehouse.update({ where: { code }, data: { ...data, updatedBy: userId } })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.WAREHOUSES,
        //   title: 'Warehouse Updated',
        //   message: `A warehouse (#${updatedWarehouse.code}) was updated by ${ctx.fullName}.`,
        //   link: `/warehouses/${updatedWarehouse.code}/view`,
        //   entityType: 'Warehouse' as Prisma.ModelName,
        //   entityCode: updatedWarehouse.code,
        //   entityId: updatedWarehouse.id,
        //   userCodes: [],
        // })

        return {
          status: 200,
          message: 'Warehouse updated successfully!',
          action: 'UPSERT_WAREHOUSE',
          data: { warehouse: updatedWarehouse },
        }
      }

      //* create warehouse
      const newWarehouse = await db.warehouse.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.ROLES,
      //   title: 'Warehouse Created',
      //   message: `A new warehouse (#${newWarehouse.code}) was created by ${ctx.fullName}.`,
      //   link: `/warehouses/${newWarehouse.code}/view`,
      //   entityType: 'Warehouse' as Prisma.ModelName,
      //   entityCode: newWarehouse.code,
      //   entityId: newWarehouse.id,
      //   userCodes: [],
      // })

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

      if (!warehouse) return { error: true, status: 404, message: 'Warehouse not found!', action: 'DELETE_WAREHOUSE' }

      await db.warehouse.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.WAREHOUSES,
      //   title: 'Warehouse Deleted',
      //   message: `A warehouse (#${warehouse.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/warehouses/${warehouse.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: warehouse.code,
      //   entityId: warehouse.id,
      //   userCodes: [],
      // })

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

export const restoreWarehouse = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const warehouse = await db.warehouse.findUnique({ where: { code: data.code } })

      if (!warehouse) return { error: true, status: 404, message: 'Warehouse not found!', action: 'RESTORE_WAREHOUSE' }

      await db.warehouse.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.WAREHOUSES,
      //   title: 'Warehouse Restored',
      //   message: `A warehouse (#${warehouse.code}) was restored by ${ctx.fullName}.`,
      //   link: `/warehouses/${warehouse.code}/view`,
      //   entityType: 'Warehouse' as Prisma.ModelName,
      //   entityCode: warehouse.code,
      //   entityId: warehouse.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Warehouse retored successfully!', action: 'RESTORE_USER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_USER',
      }
    }
  })

export async function getWarehouseMaster() {
  try {
    //* warehouse master is small enough to be fetched in a single call, no paging needed
    const req = (await callSapServiceLayerApi({
      method: 'post',
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query18')/List`,
      headers: { Prefer: `odata.maxpagesize=${WAREHOUSE_MASTER_MAX_PAGE_SIZE}` },
    })) as { value?: any[] } | null

    return (req?.value || []).filter(Boolean).sort((a, b) => String(a?.WarehouseCode).localeCompare(String(b?.WarehouseCode)))
  } catch (error) {
    console.log({ error })
    logger.error(error, 'Failed to fetch warehouse master from SAP')
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
        if (!row?.WarehouseCode) errors.push({ field: 'Code', message: 'Missing required field' })

        if (!row?.WarehouseName) errors.push({ field: 'Name', message: 'Missing required field' })

        //* if errors present, push to stats.errors and skip
        if (errors.length > 0) {
          stats.errors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        //* fetch bin locations, soft deleted ones must not be pushed into sap
        const binLocations = await getWarehouseBinLocations(row?.WarehouseCode ?? '')

        const toCreateBinLocations = binLocations
          .filter((bin) => !bin?.deletedAt && !bin?.deletedBy)
          .map((bin) => ({
            Warehouse: row?.WarehouseCode,
            BinCode: bin?.BinCode,
            Description: bin?.Description || null,
            Sublevel1: bin?.SL1Code || null,
            Sublevel2: bin?.SL2Code || null,
            Sublevel3: bin?.SL3Code || null,
            Sublevel4: bin?.SL4Code || null,
          }))

        const toCreate = {
          WarehouseCode: row?.WarehouseCode,
          WarehouseName: row?.WarehouseName,
          Nettable: row?.Nettable ? 'tYES' : 'tNO',
          EnableBinLocations: row?.EnableBinLocations ? 'tYES' : 'tNO',
          Street: row?.Street || null,
          AddressName2: row?.Address2 || null,
          AddressName3: row?.Address3 || null,
          StreetNo: row?.StreetNo || null,
          BuildingFloorRoom: row?.BuildingFloorRoom || null,
          Block: row?.Block || null,
          City: row?.City || null,
          ZipCode: row?.ZipCode || null,
          County: row?.County || null,
          Country: row?.CountryCode || null,
          State: row?.StateCode || null,
          GlobalLocationNumber: row?.GlobalLocationNumber || null,
          U_Portal_Sync: 'Y',
        }

        //* push the batch item to the sapBatch array
        //* bin locations are a separate sap entity, so they are created right after the warehouse they belong to
        sapBatch.push({
          rowNumber,
          code: row?.code,
          promise: (async () => {
            const warehouseResult = await callSapServiceLayerApi({
              url: `${SAP_BASE_URL}/b1s/v1/Warehouses`,
              method: 'post',
              data: toCreate,
            })

            //* skip bin locations when the warehouse itself failed
            if (isSapError(warehouseResult)) return { warehouseResult, binResults: [] }

            const binResults = await Promise.all(
              toCreateBinLocations.map((bin) =>
                callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/BinLocations`, method: 'post', data: bin })
              )
            )

            return { warehouseResult, binResults }
          })(),
          row,
        })
      }

      //* create warehouses into sap
      const sapCreated = await Promise.all(sapBatch.map((b) => b.promise))

      //* populate error if any related to sap, otherwise collect success codes
      for (let i = 0; i < sapCreated.length; i++) {
        const batchItem = sapBatch[i] //* sapCreated and sapBatch have the same order
        const warehouseResult = sapCreated[i]?.warehouseResult
        const binResults = sapCreated[i]?.binResults || []

        const pushError = (entry: ImportSyncErrorEntry) => {
          //* find existing stats error related to the batch item's code
          const importSyncError = stats.errors.find((e) => e?.code === batchItem?.code)

          //* update the error if there existing importSyncError otherwise create a new one
          if (importSyncError) {
            importSyncError.entries.push(entry)
          } else {
            stats.errors.push({
              rowNumber: batchItem.rowNumber,
              entries: [entry],
              row: batchItem.row,
              code: batchItem.code,
            })
          }
        }

        //* if error present means there's an error when creating in sap
        if (isSapError(warehouseResult)) {
          pushError({ field: 'SAP Error', message: getSapErrorMessage(warehouseResult) })
          continue
        }

        //* a failed bin location is reported but does not block the warehouse from being marked as synced
        binResults.forEach((binResult: any) => {
          if (!isSapError(binResult)) return
          pushError({ field: 'SAP Error (Bin Location)', message: getSapErrorMessage(binResult) })
        })

        //* only codes that did not encounter a sap error are added
        toUpdateSyncStatus.push(batchItem.code)
      }

      //* update the sync status of the warehouses created in sap
      await db.warehouse.updateMany({
        where: { code: { in: toUpdateSyncStatus } },
        data: { syncStatus: 'synced', updatedBy: userId },
      })

      //* progress based on warehouses processed (attempted) this chunk
      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + toUpdateSyncStatus.length, //* only warehouses successfully created in SAP
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      //* create notification only when the whole sync is completed
      // if (updatedStats.status === 'completed') {
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES.WAREHOUSES,
      //     title: 'Warehouses Synced To SAP',
      //     message: `${updatedStats.completed - updatedStats.errors.length} of ${total} warehouse${total > 1 ? 's were' : ' was'} synced into SAP by ${ctx.fullName}. ${updatedStats.errors.length} error${updatedStats.errors.length > 1 ? 's' : ''} found.`,
      //     link: `/warehouses`,
      //     entityType: 'Warehouse' as Prisma.ModelName,
      //     userCodes: [],
      //   })
      // }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} warehouses synced into SAP. ${updatedStats.errors.length} errors found.`,
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

    const SYNC_META_CODE = 'warehouse'

    try {
      //* get last sync date
      const syncMeta = await db.syncMeta.findUnique({ where: { code: SYNC_META_CODE } })
      const lastSyncDate = syncMeta?.lastSyncAt || new Date('01/01/2020')

      const binLocationMap = new Map<string, any[]>()
      const batch: Prisma.WarehouseUncheckedCreateInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]
        const rowNumber = stats.completed + i + 1 //* global row number across chunks

        //* skip (not an error): not created/updated since last sync
        //* the sql query endpoint returns compact yyyyMMdd dates with no time component
        const createDate = parseSapCompactDate(row?.CreateDate)
        const updateDate = parseSapCompactDate(row?.UpdateDate)

        const isCreateDateSameDay = createDate ? isSameDay(createDate, lastSyncDate) : false
        const isUpdateDateSameDay = updateDate ? isSameDay(updateDate, lastSyncDate) : false
        const isCreateDateAfter = createDate ? isAfter(createDate, lastSyncDate) : false
        const isUpdateDateAfter = updateDate ? isAfter(updateDate, lastSyncDate) : false

        if (!(isCreateDateSameDay || isUpdateDateSameDay || isCreateDateAfter || isUpdateDateAfter)) continue

        //* check required fields
        if (!row || !row?.WarehouseCode) errors.push({ field: 'WarehouseCode', message: 'Missing required field' })

        //* if errors array is not empty, then update/push to stats.errors
        if (errors.length > 0) {
          stats.errors.push({ rowNumber, entries: errors, row, code: row?.WarehouseCode, name: row?.WarehouseName })
          continue
        }

        //* reshape data
        batch.push({
          syncStatus: 'synced',

          //* sap fields
          WarehouseCode: row.WarehouseCode,
          WarehouseName: row?.WarehouseName || '',
          Nettable: row?.Nettable === 'Y',
          EnableBinLocations: row?.EnableBinLocations === 'Y',
          DefaultBin: row?.DefaultBin ? safeParseInt(row.DefaultBin) : null,
          Street: row?.Street || null,
          Address2: row?.Address2 || null,
          Address3: row?.Address3 || null,
          StreetNo: row?.StreetNo || null,
          BuildingFloorRoom: row?.BuildingFloorRoom || null,
          Block: row?.Block || null,
          City: row?.City || null,
          ZipCode: row?.ZipCode || null,
          County: row?.County || null,
          CountryCode: row?.CountryCode || null,
          CountryName: row?.CountryName || null,
          StateCode: row?.StateCode || null,
          StateName: row?.StateName || null,
          GlobalLocationNumber: row?.GlobalLocationNumber || null,
        })
      }

      //* sap bin locations carry no create/update date, and editing a bin in sap (obin) does not
      //* bump the warehouse master's UpdateDate (owhs) — so bins are refreshed for every warehouse
      //* in the chunk, not just the date-filtered batch, otherwise bin-only changes never reach the portal
      const chunkWarehouseCodes = Array.from(new Set(data.map((row: any) => row?.WarehouseCode).filter(Boolean) as string[]))

      //* a bin's parent warehouse must exist (fk), so only refresh codes that are being upserted
      //* in this batch or were already synced in a previous run
      const existingWarehouses = await db.warehouse.findMany({
        where: { WarehouseCode: { in: chunkWarehouseCodes } },
        select: { WarehouseCode: true },
      })

      const batchCodes = new Set(batch.map((wh) => wh.WarehouseCode))
      const existingCodes = new Set(existingWarehouses.map((wh) => wh.WarehouseCode))
      const binRefreshCodes = chunkWarehouseCodes.filter((code) => batchCodes.has(code) || existingCodes.has(code))

      const warehouseBinLocations = await Promise.all(binRefreshCodes.map((code) => getMasterBinLocations(code)))

      binRefreshCodes.forEach((code, index) => {
        binLocationMap.set(code, warehouseBinLocations[index] ?? [])
      })

      const upsertBinLocations = async (warehouseCodes: string[], tx: any) => {
        for (const warehouseCode of warehouseCodes) {
          const binLocations = binLocationMap.get(warehouseCode) ?? []

          const binLocationsData = binLocations?.map((bin: any) => ({
            WarehouseCode: warehouseCode,
            BinCode: bin?.BinCode || '',
            Description: bin?.Description || null,
            SL1Code: bin?.Sublevel1 || '',
            SL2Code: bin?.Sublevel2 || null,
            SL3Code: bin?.Sublevel3 || null,
            SL4Code: bin?.Sublevel4 || null,
          }))

          //* upsert only — bins removed in sap are intentionally kept in the portal
          //TODO: examine performance issues
          if (binLocationsData.length > 0) {
            for (const bin of binLocationsData) {
              if (!bin.BinCode) continue

              await tx.warehouseBinLocation.upsert({
                where: { BinCode: bin.BinCode },
                create: {
                  ...bin,
                  createdBy: userId,
                  updatedBy: userId,
                },
                update: {
                  ...bin,
                  updatedBy: userId,
                },
              })
            }
          }
        }
      }

      //* commit the chunk, single transaction since data is already chunked (max 1 chunk per call)
      //* timeout raised: bins are now refreshed for every warehouse in the chunk, not just the batch
      await db.$transaction(
        async (tx) => {
          await Promise.all(
            batch.map((warehouseData) =>
              tx.warehouse.upsert({
                where: { WarehouseCode: warehouseData.WarehouseCode },
                create: { ...warehouseData, createdBy: userId, updatedBy: userId },
                update: { ...warehouseData, updatedBy: userId },
              })
            )
          )
          await upsertBinLocations(binRefreshCodes, tx)
        },
        { timeout: 120000, maxWait: 10000 }
      )

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
          create: { code: SYNC_META_CODE, description: 'Last warehouse master synced date', lastSyncAt: new Date() },
          update: { code: SYNC_META_CODE, description: 'Last warehouse master synced date', lastSyncAt: new Date() },
        })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.WAREHOUSES,
        //   title: 'Warehouses Synced From SAP',
        //   message: `Warehouse${total > 1 ? 's were' : ' was'} synced from SAP by ${ctx.fullName}.`,
        //   link: `/warehouses`,
        //   entityType: 'Warehouse' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} warehouse master synced. ${updatedStats.errors.length} errors found.`,
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
