'use server'

import z from 'zod'

import { paramsSchema } from '@/schema/common'
import { projectGroupFormSchema } from '@/schema/project-group'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { Prisma } from '@prisma/client'
import { ImportError, ImportErrorEntry } from '@/types/common'

const COMMON_PROJECT_GROUP_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectGroupOrderByWithRelationInput

export async function getPgs() {
  try {
    return await db.projectGroup.findMany({
      where: { deletedAt: null, deletedBy: null },
      orderBy: COMMON_PROJECT_GROUP_ORDER_BY,
    })
  } catch (error) {
    return []
  }
}

export const getPgsClient = action.use(authenticationMiddleware).action(async () => {
  return getPgs()
})

export async function getPgByCode(code: number) {
  if (!code) return null

  try {
    return await db.projectGroup.findUnique({ where: { code } })
  } catch (err) {
    return null
  }
}

export const upsertPg = action
  .use(authenticationMiddleware)
  .schema(projectGroupFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update project group
      if (code !== -1) {
        const updatedPg = await db.projectGroup.update({ where: { code }, data: { ...data, updatedBy: userId } })

        return {
          status: 200,
          message: 'Project group updated successfully!',
          action: 'UPSERT_PROJECT_GROUP',
          data: { projectGroup: updatedPg },
        }
      }

      //* create project group
      const newPg = await db.projectGroup.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      return {
        status: 200,
        message: 'Project group created successfully!',
        action: 'UPSERT_PROJECT_GROUP',
        data: { projectGroup: newPg },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_PROJECT_GROUP',
      }
    }
  })

export const deleletePg = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectGroup = await db.projectGroup.findUnique({ where: { code: data.code } })

      if (!projectGroup) return { error: true, status: 404, message: 'Project group not found', action: 'DELETE_PROJECT_GROUP' }

      await db.projectGroup.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Project group deleted successfully!', action: 'DELETE_PROJECT_GROUP' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_PROJECT_GROUP',
      }
    }
  })

export const importPgs = action
  .use(authenticationMiddleware)
  .schema(z.object({ data: z.array(z.record(z.string(), z.any())) }))
  .action(async ({ ctx, parsedInput }) => {
    const { data } = parsedInput
    const { userId } = ctx

    const importErrors: ImportError[] = []

    try {
      const batch: Prisma.ProjectGroupCreateManyInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportErrorEntry[] = []
        const row = data[i]

        //* check required fields
        if (!row?.['Name']) errors.push({ field: 'Name', message: 'Missing required fields' })

        //* if errors array is not empty, then update/push to importErrors
        if (errors.length > 0) {
          importErrors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* reshape data
        const toCreate: Prisma.ProjectGroupCreateManyInput = {
          name: row['Name'],
          description: row?.['Description'] || null,
          isActive: row?.['Active'] === '1' ? true : false,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.projectGroup.createMany({
        data: batch,
        skipDuplicates: true,
      })

      return {
        status: 200,
        message: `Project groups imported successfully!. ${importErrors.length} errors found.`,
        action: 'IMPORT_PROJECT_GROUPS',
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
        action: 'IMPORT_PROJECT_GROUPS',
        errors,
      }
    }
  })
