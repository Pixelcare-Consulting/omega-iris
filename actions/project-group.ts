'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { projectGroupFormSchema, projectGroupPicFormSchema } from '@/schema/project-group'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { importFormSchema } from '@/schema/import'
import { getCurrentUserAbility } from './auth'
import { createNotification } from './notification'
import { PERMISSIONS_ALLOWED_ACTIONS, PERMISSIONS_CODES } from '@/constants/permission'

const COMMON_PROJECT_GROUP_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectGroupOrderByWithRelationInput

export async function getPgs(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { userId, userCode, ability } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-projects-groups')
    const canViweOwned = ability?.can('view (owner)', 'p-projects-groups')

    const where: Prisma.ProjectGroupWhereInput | undefined =
      !ability || canViewAll
        ? undefined
        : canViweOwned
          ? {
              OR: [
                { projectGroupPics: { some: { userCode } } },
                { projectIndividuals: { some: { projectIndividualCustomers: { some: { userCode } } } } },
                { projectIndividuals: { some: { projectIndividualPics: { some: { userCode } } } } },
                { createdBy: userId },
              ],
            }
          : { code: -1 }

    return db.projectGroup.findMany({ orderBy: COMMON_PROJECT_GROUP_ORDER_BY, where })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPgsClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getPgs(ctx)
})

export async function getPgByCode(code: number, userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!code || !userInfo || !userInfo.userId || !userInfo.userCode) return null

  const { userId, userCode, ability } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-projects-groups')
    const canViweOwned = ability?.can('view (owner)', 'p-projects-groups')

    const where: Prisma.ProjectGroupWhereUniqueInput =
      !ability || canViewAll
        ? { code }
        : canViweOwned
          ? {
              code,
              OR: [
                { projectGroupPics: { some: { userCode } } },
                { projectIndividuals: { some: { projectIndividualCustomers: { some: { userCode } } } } },
                { projectIndividuals: { some: { projectIndividualPics: { some: { userCode } } } } },
                { createdBy: userId },
              ],
            }
          : { code: -1 }

    const projectGroup = await db.projectGroup.findUnique({ where })

    if (!projectGroup) return null

    //TODO: separate the fetching of customers and pics into separate actions & hooks
    const pics = await db.projectGroupPic.findMany({ where: { projectGroupCode: code }, select: { userCode: true } })

    return { ...projectGroup, pics: pics.map((p) => p.userCode) }
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertPg = action
  .use(authenticationMiddleware)
  .schema(projectGroupFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, pics, ...data } = parsedInput
    const { userId } = ctx

    try {
      if (code !== -1) {
        const [updatedPg] = await db.$transaction([
          //* update project group
          db.projectGroup.update({ where: { code }, data: { ...data, updatedBy: userId } }),

          //* delete existing project group pics
          db.projectGroupPic.deleteMany({ where: { projectGroupCode: code } }),

          //* create new project group pics
          db.projectGroupPic.createManyAndReturn({
            data: pics.map((p) => ({ projectGroupCode: code, userCode: p })),
          }),
        ])

        return {
          status: 200,
          message: 'Project group updated successfully!',
          action: 'UPSERT_PROJECT_GROUP',
          data: { projectGroup: updatedPg },
        }
      }

      //* create project group
      const newPg = await db.projectGroup.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          projectGroupPics: {
            createMany: {
              data: pics.map((p) => ({ userCode: p })),
            },
          },
        },
        include: {
          projectGroupPics: {
            //* only return the p.i.c that has role which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT GROUPS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
            },
            select: { userCode: true },
          },
        },
      })

      // //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT GROUPS'],
      //   title: 'Project Group Created',
      //   message: `A new project group (#${newPg.code}) was created by ${ctx.fullName}.`,
      //   link: `/project/groups/${newPg.code}/view`,
      //   entityType: 'ProjectGroup' as Prisma.ModelName,
      //   entityCode: newPg.code,
      //   entityId: newPg.id,
      //   userCodes: [],
      // })
      //   .then(() => {
      //     //* notify assigned p.i.cs
      //     //* do not notify already notified user
      //     // Promise.all()
      //   })
      //   .catch((error) => console.error(error))

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
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
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

export const updatePgPics = action
  .use(authenticationMiddleware)
  .schema(projectGroupPicFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, pics } = parsedInput
    const { userId } = ctx

    try {
      const projectGroup = await db.projectGroup.findUnique({ where: { code } })

      if (!projectGroup) {
        return { error: true, status: 404, message: 'Project group not found!', action: 'UPDATE_PROJECT_GROUP_PICS' }
      }

      //* update project group
      const [updatedProjectGprojectGroup] = await db.$transaction([
        //* update project group
        db.projectGroup.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project group pics
        db.projectGroupPic.deleteMany({ where: { projectGroupCode: code } }),

        //* create new project group pics
        db.projectGroupPic.createManyAndReturn({
          data: pics.map((p) => ({ projectGroupCode: code, userCode: p })),
        }),
      ])

      return {
        status: 200,
        message: `Project group's P.I.Cs updated successfully!`,
        action: 'UPDATE_PROJECT_GROUP_PICS',
        data: { projectGroup: updatedProjectGprojectGroup },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_GROUP_PICS',
      }
    }
  })
