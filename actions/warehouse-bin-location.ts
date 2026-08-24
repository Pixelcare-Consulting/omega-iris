'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'
import { whBinLocationFormSchema } from '@/schema/warehouse'
import { paramsSchema } from '@/schema/common'
import { PERMISSIONS_CODES } from '@/constants/permission'
import { createNotification } from './notification'
import { Prisma } from '@prisma/client'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL, WAREHOUSE_BIN_LOCATION_MAX_PAGE_SIZE } from '@/constants/sap'
import { safeParseInt } from '@/utils'
import logger from '@/utils/logger'

export async function getWarehouseBinLocations(warehouseCode: string) {
  if (!warehouseCode) return []

  try {
    return db.warehouseBinLocation.findMany({ where: { WarehouseCode: warehouseCode }, orderBy: { updatedAt: 'asc' } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getMasterBinLocations(warehouseCode: string) {
  if (!warehouseCode) return []

  try {
    const totalCount = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/BinLocations/$count?$filter=Warehouse eq '${warehouseCode}'`,
    })

    if (!totalCount || totalCount <= 0) return []

    const totalPages = Math.ceil(safeParseInt(totalCount) / WAREHOUSE_BIN_LOCATION_MAX_PAGE_SIZE)
    const requestPromises: Promise<any>[] = []

    for (let i = 0; i < totalPages; i++) {
      const skip = i * WAREHOUSE_BIN_LOCATION_MAX_PAGE_SIZE

      requestPromises.push(
        callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/BinLocations?$select=AbsEntry,BinCode,Warehouse,Sublevel1,Sublevel2,Sublevel3,Sublevel4,Description&$filter=Warehouse eq '${warehouseCode}'&$skip=${skip}&$orderby=BinCode asc`,
          headers: { Prefer: `odata.maxpagesize=${WAREHOUSE_BIN_LOCATION_MAX_PAGE_SIZE}` },
        })
      )
    }

    const binLocationResults = await Promise.all(requestPromises)

    return binLocationResults.flatMap((res) => res?.value || []).filter(Boolean)
  } catch (error) {
    console.error(error)
    logger.error(error, `Failed to fetch bin locations from SAP: Warehouse (${warehouseCode})`)
    return []
  }
}

export const getWarehouseBinLocationsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ warehouseCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getWarehouseBinLocations(parsedInput.warehouseCode)
  })

export const upsertWarehouseBinLocation = action
  .use(authenticationMiddleware)
  .schema(whBinLocationFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingBinLocation = await db.warehouseBinLocation.findFirst({
        where: { BinCode: data.BinCode, ...(code && code !== -1 && { code: { not: code } }) },
      })

      //* check if existing
      if (existingBinLocation) return { error: true, status: 401, message: 'Code already exists!', action: 'UPSERT_WAREHOUSE_BIN_LOCATION' }

      //* update bin location
      if (code !== -1) {
        const updatedBinLocation = await db.warehouseBinLocation.update({ where: { code }, data: { ...data, updatedBy: userId } })

        //* create notification
        void createNotification(ctx, {
          permissionCode: PERMISSIONS_CODES['WAREHOUSE BIN LOCATIONS'],
          title: 'Warehouse Bin Location Updated',
          message: `A warehouse bin location (#${updatedBinLocation.BinCode}) was updated by ${ctx.fullName}.`,
          link: `/warehouses/${updatedBinLocation.WarehouseCode}/view`,
          entityType: 'WarehouseBinLocation' as Prisma.ModelName,
          entityCode: updatedBinLocation.code,
          entityId: updatedBinLocation.id,
          userCodes: [],
        })

        return {
          status: 200,
          message: 'Bin location updated successfully!',
          action: 'UPSERT_WAREHOUSE_BIN_LOCATION',
          data: { warehouseBinLocation: updatedBinLocation },
        }
      }

      //* create bin location
      const newBinLocation = await db.warehouseBinLocation.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WAREHOUSE BIN LOCATIONS'],
      //   title: 'Warehouse Bin Location Created',
      //   message: `A new warehouse bin location (#${newBinLocation.BinCode}) was created by ${ctx.fullName}.`,
      //   link: `/warehouses/${newBinLocation.WarehouseCode}/view`,
      //   entityType: 'WarehouseBinLocation' as Prisma.ModelName,
      //   entityCode: newBinLocation.code,
      //   entityId: newBinLocation.id,
      //   userCodes: [],
      // })

      return {
        status: 200,
        message: 'Bin location created successfully!',
        action: 'UPSERT_WAREHOUSE_BIN_LOCATION',
        data: { warehouseBinLocation: newBinLocation },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_WAREHOUSE_BIN_LOCATION',
      }
    }
  })

export const deleleteWarehouseBinLocation = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const warehouseBinLocation = await db.warehouseBinLocation.findUnique({ where: { code: data.code } })

      if (!warehouseBinLocation)
        return { error: true, status: 404, message: 'Bin Location not found!', action: 'DELETE_WAREHOUSE_BIN_LOCATION' }

      await db.warehouseBinLocation.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WAREHOUSE BIN LOCATIONS'],
      //   title: 'Warehouse Bin Location Deleted',
      //   message: `A warehouse bin location (#${warehouseBinLocation.BinCode}) was deleted by ${ctx.fullName}.`,
      //   link: `/warehouses/${warehouseBinLocation.WarehouseCode}/view`,
      //   entityType: 'WarehouseBinLocation' as Prisma.ModelName,
      //   entityCode: warehouseBinLocation.code,
      //   entityId: warehouseBinLocation.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Role deleted successfully!', action: 'DELETE_WAREHOUSE_BIN_LOCATION' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_WAREHOUSE_BIN_LOCATION',
      }
    }
  })

export const restoreWarehouseBinLocation = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const warehouseBinLocation = await db.warehouseBinLocation.findUnique({ where: { code: data.code } })

      if (!warehouseBinLocation) return { error: true, status: 404, message: 'Bin not found!', action: 'RESTORE_ROLE' }

      await db.warehouseBinLocation.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WAREHOUSE BIN LOCATIONS'],
      //   title: 'Warehouse Bin Location Restored',
      //   message: `A warehouse bin location (#${warehouseBinLocation.BinCode}) was restored by ${ctx.fullName}.`,
      //   link: `/warehouses/${warehouseBinLocation.WarehouseCode}/view`,
      //   entityType: 'WarehouseBinLocation' as Prisma.ModelName,
      //   entityCode: warehouseBinLocation.code,
      //   entityId: warehouseBinLocation.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Role retored successfully!', action: 'RESTORE_ROLE' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_ROLE',
      }
    }
  })
