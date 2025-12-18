'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { projectItemFormSchema } from '@/schema/project-item'
import { paramsSchema } from '@/schema/common'
import { safeParseFloat, safeParseInt } from '@/utils'
import { importFormSchema } from '@/schema/import'
import { ImportSyncErrorEntry } from '@/types/common'
import { isValid, parse } from 'date-fns'

const COMMON_PROJECT_ITEM_INCLUDE = {
  item: true,
  dateReceivedByUser: { select: { fname: true, lname: true } },
  warehouse: { select: { code: true, name: true, description: true } },
} satisfies Prisma.ProjectItemInclude

const COMMON_PROJECT_ITEM_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectItemOrderByWithRelationInput

export async function getProjecItems(projectCode: number) {
  if (!projectCode) return []

  try {
    const result = await db.projectItem.findMany({
      where: { deletedAt: null, deletedBy: null, projectIndividualCode: projectCode },
      include: COMMON_PROJECT_ITEM_INCLUDE,
      orderBy: COMMON_PROJECT_ITEM_ORDER_BY,
    })

    return result.map((item) => ({
      ...item,
      cost: safeParseFloat(item.cost),
      availableToOrder: safeParseFloat(item.availableToOrder),
      inProcess: safeParseFloat(item.inProcess),
      totalStock: safeParseFloat(item.totalStock),
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getProjecItemsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ projectCode: z.number() }))
  .action(async ({ parsedInput: data }) => {
    return await getProjecItems(data.projectCode)
  })

export async function getProjectItemByCode(code: number) {
  if (!code) return null

  try {
    return await db.projectItem.findUnique({
      where: { code },
      include: COMMON_PROJECT_ITEM_INCLUDE,
    })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertProjectItem = action
  .use(authenticationMiddleware)
  .schema(projectItemFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update item
      if (code !== -1) {
        //* update project item
        const updatedItem = await db.projectItem.update({ where: { code }, data: { ...data, updatedBy: userId } })

        return {
          status: 200,
          message: 'Project item updated successfully!',
          action: 'UPSERT_PROJECT_ITEM',
          data: { projectItem: updatedItem },
        }
      }

      //* create item
      const newItem = await db.projectItem.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      })

      return {
        status: 200,
        message: 'Project item created successfully!',
        action: 'UPSERT_PROJECT_ITEM',
        data: { projectItem: newItem },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_PROJECT_ITEM',
      }
    }
  })

export const deleteProjectItem = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ parsedInput: data }) => {
    try {
      const projectItem = await db.projectItem.findUnique({ where: { code: data.code } })

      if (!projectItem) return { error: true, status: 404, message: 'Project item not found!', action: 'DELETE_PROJECT_ITEM' }

      await db.projectItem.delete({ where: { code: data.code } }) //* hard delete

      return { status: 200, message: 'Item deleted successfully!', action: 'DELETE_PROJECT_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_PROJECT_ITEM',
      }
    }
  })

export const importProjectItems = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow, metaData } = parsedInput
    const { userId } = ctx

    const projectCode = metaData?.projectCode

    const mpns = data?.map((row) => row?.['MFG_P/N'])?.filter(Boolean) || []
    const uniqueMpns = [...new Set(mpns)]

    try {
      const batch: Prisma.ProjectItemCreateManyInput[] = []

      //* get existing items
      const existingItems = await db.item.findMany({
        where: { OR: [{ manufacturerPartNumber: { in: uniqueMpns } }, { ItemCode: { in: uniqueMpns } }] },
        select: { code: true, manufacturerPartNumber: true, ItemCode: true }, //* manufacturerPartNumber can be remove in the future
      })

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const baseItem = existingItems.find(
          (item) => item.manufacturerPartNumber === row?.['MFG_P/N'] || item.ItemCode === row?.['MFG_P/N']
        )

        //* check required fields
        if (!row?.['MFG_P/N']) errors.push({ field: 'MFG_P/N', message: 'Missing required fields' })

        //* check if project code is provided
        if (!projectCode) errors.push({ field: 'Project Code', message: 'Project code not found' })

        //* check if MFG_P/N of an item exist in the db
        if (row?.['MFG_P/N'] && !baseItem) errors.push({ field: 'MFG_P/N', message: 'MFG_P/N does not exist' })

        //* check if date received provided and its is a valid  date
        if (row?.['Date_Received'] && !isValid(parse(row?.['Date_Received'], 'MM/dd/yyyy', new Date()))) {
          errors.push({ field: 'Date_Received', message: 'Date received is not a valid date' })
        }

        //* if errors array is not empty, then update/push to stats.error
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* reshape data
        const toCreate: Prisma.ProjectItemCreateManyInput = {
          itemCode: baseItem?.code!,
          projectIndividualCode: projectCode!,
          partNumber: row?.['Part_Number'] || null,
          dateCode: row?.['Date_Code'] || null,
          countryOfOrigin: row?.['Country_Origin'] || null,
          lotCode: row?.['Lot_Code'] || null,
          palletNo: row?.['Pallet_No'] || null,
          packagingType: row?.['Packaging_Type'] || null,
          spq: row?.['SPQ'] || null,
          cost: safeParseFloat(row?.['Cost']),
          availableToOrder: safeParseFloat(row?.['Available_To_Order']),
          inProcess: safeParseFloat(row?.['In_Process_Pending']),
          totalStock: safeParseFloat(row?.['Total_Stock']),
          notes: row?.['Notes'] || null,
          siteLocation: row?.['Site_Location'] || null,
          subLocation2: row?.['Sub_Location2'] || null,
          subLocation3: row?.['Sub_Location3'] || null,
          dateReceived: row?.['Date_Received'] ? parse(row?.['Date_Received'], 'MM/dd/yyyy', new Date()) : null,
          dateReceivedBy: safeParseInt(row?.['Received_By']) || null,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.projectItem.createMany({
        data: batch,
        skipDuplicates: true,
      })

      const progress = ((stats.completed + batch.length) / total) * 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + batch.length,
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      return {
        status: 200,
        message: `${updatedStats.completed} project items created successfully!`,
        action: 'IMPORT_PROJECT_ITEMS',
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
        action: 'IMPORT_PROJECT_ITEMS',
        stats,
      }
    }
  })
