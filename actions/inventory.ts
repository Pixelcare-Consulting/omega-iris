'use server'

import { Prisma } from '@prisma/client'
import { isValid, parse } from 'date-fns'
import z from 'zod'

import { paramsSchema } from '@/schema/common'
import { inventoryFormSchema } from '@/schema/inventory'
import { safeParseFloat } from '@/utils'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportError, ImportErrorEntry } from '@/types/common'

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
    const { code, warehouseInventory, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingInventory = await db.inventory.findFirst({
        where: {
          manufacturerPartNumber: data.manufacturerPartNumber,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingInventory) return { error: true, status: 401, message: 'MFG P/N already exists!', action: 'UPSERT_INVENTORY' }

      if (code !== -1) {
        const updatedInventory = await db.$transaction(async (tx) => {
          //* update inventory
          const updatedWi = await tx.inventory.update({ where: { code }, data: { ...data, updatedBy: userId } })

          if (warehouseInventory.length > 0) {
            //* upsert warehouse inventory
            await Promise.all(
              warehouseInventory.map(({ name: warehouseName, code: warehouseCode, ...wi }) => {
                return tx.warehouseInventory.upsert({
                  where: {
                    warehouseCode_inventoryCode: {
                      warehouseCode: warehouseCode,
                      inventoryCode: code,
                    },
                  },
                  create: {
                    warehouseCode: warehouseCode,
                    inventoryCode: code,
                    ...wi,
                    createdBy: userId,
                    updatedBy: userId,
                  },
                  update: { ...wi, updatedBy: userId },
                })
              })
            )
          }

          return updatedWi
        })

        return {
          status: 200,
          message: 'Inventory updated successfully!',
          action: 'UPSERT_INVENTORY',
          data: { inventory: updatedInventory },
        }
      }

      //* create inventory
      const newInventory = await db.inventory.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          warehouseInventories: {
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

export const importInventories = action
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

      //* get existing inventory manufacturer part numbers
      const existingMfgpns = (
        await db.inventory.findMany({ where: { manufacturerPartNumber: { in: mfgpns } }, select: { manufacturerPartNumber: true } })
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

        //* add to be created inventory manufacturer part numbers
        toBeCreatedMfgpns.push(row['MFG_P/N'])

        //* reshape data
        const toCreate: Prisma.InventoryCreateManyInput = {
          manufacturerPartNumber: row['MFG_P/N'],
          userCode: row?.['Customer_ID'] || null,
          projectIndividualCode: row?.['Project_ID'] || null,
          partNumber: row?.['Part_Number'] || null,
          manufacturer: row?.['Manufacturer'] || null,
          description: row?.['Description'] || null,
          dateReceived: isValid(parse(row['Date_Received'], 'MM-dd-yyyy', new Date()))
            ? parse(row['Date_Received'], 'MM-dd-yyyy', new Date())
            : null,
          dateCode: row?.['Date_Code'] || null,
          lotCode: row?.['Lot_Code'] || null,
          countryOfOrigin: row?.['Country_Origin'] || null,
          packagingType: row?.['Packaging_Type'] || null,
          spq: row?.['SPQ'] || null,
          palletSize: row?.['Pallet_Size'] || null,
          palletNo: row?.['Pallet_No'] || null,
          notes: row?.['Notes'] || null,
          siteLocation: row?.['Site_Location'] || null,
          subLocation1: row?.['Sub_Location'] || null,
          subLocation2: row?.['Sub_Location2'] || null,
          subLocation3: row?.['Sub_Location3'] || null,
          subLocation4: row?.['Sub_Location4'] || null,
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      const created = await db.inventory.createManyAndReturn({
        data: batch,
        skipDuplicates: true,
      })

      return {
        status: 200,
        message: `Project inventories imported successfully!. ${created.length}/${data.length} inventories created. ${importErrors.length} errors found.`,
        action: 'IMPORT_INVENTORIES',
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
        action: 'IMPORT_INVENTORIES',
        errors,
      }
    }
  })

export const deleteInventory = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const inventory = await db.inventory.findUnique({ where: { code: data.code } })

      if (!inventory) return { error: true, status: 404, message: 'Inventory not found', action: 'DELETE_INVENTORY' }

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
