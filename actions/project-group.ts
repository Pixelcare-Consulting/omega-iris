'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { projectGroupFormSchema } from '@/schema/project-group'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { importFormSchema } from '@/schema/import'
import { getCurrentUserAbility } from './auth'

const COMMON_PROJECT_GROUP_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectGroupOrderByWithRelationInput

export async function getPgs(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { userId, userCode, ability } = userInfo

  try {
    if (!ability) {
      return db.projectGroup.findMany({
        orderBy: COMMON_PROJECT_GROUP_ORDER_BY,
      })
    }

    const viewAll = ability.can('view', 'p-projects-groups')
    const viweOwned = ability.can('view (owner)', 'p-projects-groups')

    return db.projectGroup.findMany({
      orderBy: COMMON_PROJECT_GROUP_ORDER_BY,
      where: viewAll
        ? undefined
        : viweOwned
          ? {
              OR: [
                {
                  projectIndividuals: { some: { projectIndividualCustomers: { some: { userCode } } } },
                },
                {
                  projectIndividuals: { some: { projectIndividualPics: { some: { userCode } } } },
                },
                { createdBy: userId },
              ],
            }
          : { code: -1 },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPgsClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getPgs(ctx)
})

export async function getPgByCode(code: number) {
  if (!code) return null

  try {
    return db.projectGroup.findUnique({ where: { code } })
  } catch (error) {
    console.error(error)
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

      if (!projectGroup) return { error: true, status: 404, message: 'Project group not found!', action: 'DELETE_PROJECT_GROUP' }

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

export const restorePg = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ parsedInput: data }) => {
    try {
      const projectGroup = await db.projectGroup.findUnique({ where: { code: data.code } })

      if (!projectGroup) return { error: true, status: 404, message: 'Project group not found!', action: 'RESTORE_PROJECT_GROUP' }

      await db.projectGroup.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      return { status: 200, message: 'Project group retored successfully!', action: 'RESTORE_PROJECT_GROUP' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_PROJECT_GROUP',
      }
    }
  })

export const importPgs = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow } = parsedInput
    const { userId } = ctx

    try {
      const batch: Prisma.ProjectGroupCreateManyInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        //* check required fields
        if (!row?.['Name']) errors.push({ field: 'Name', message: 'Missing required field' })

        //* if errors array is not empty, then update/push to stats.error
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
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

      const progress = ((stats.completed + batch.length) / total) * 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + batch.length,
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      return {
        status: 200,
        message: `${updatedStats.completed} project group created successfully!`,
        action: 'IMPORT_PROJECT_GROUPS',
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
        action: 'IMPORT_PROJECT_GROUPS',
        stats,
      }
    }
  })
