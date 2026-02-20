'use server'

import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { db } from '@/utils/db'
import {
  customerProjectIndividualsFormSchema,
  projectIndividualCustomerFormSchema,
  projectIndividualFormSchema,
  projectIndividualPicFormSchema,
  projectIndividualSupplierFormSchema,
} from '@/schema/project-individual'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import z from 'zod'
import { ImportSyncErrorEntry } from '@/types/common'
import { importFormSchema } from '@/schema/import'
import { getCurrentUserAbility } from './auth'
import { safeParseInt } from '@/utils'
import { PERMISSIONS_ALLOWED_ACTIONS, PERMISSIONS_CODES } from '@/constants/permission'
import { createNotification } from './notification'

const COMMON_PROJECT_INDIVIDUAL_INCLUDE = {
  projectGroup: { select: { code: true, name: true } },
} satisfies Prisma.ProjectIndividualInclude

const COMMON_PROJECT_INDIVIDUAL_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectIndividualOrderByWithRelationInput

export async function getPis(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { userId, userCode, ability } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-projects-individuals')
    const canViweOwned = ability?.can('view (owner)', 'p-projects-individuals')

    const where: Prisma.ProjectIndividualWhereInput | undefined =
      !ability || canViewAll
        ? undefined
        : canViweOwned
          ? {
              OR: [
                { projectGroup: { projectGroupPics: { some: { userCode } } } },
                { projectIndividualCustomers: { some: { userCode } } },
                { projectIndividualPics: { some: { userCode } } },
                { createdBy: userId },
              ],
            }
          : { code: -1 }

    return db.projectIndividual.findMany({ include: COMMON_PROJECT_INDIVIDUAL_INCLUDE, orderBy: COMMON_PROJECT_INDIVIDUAL_ORDER_BY, where })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getPis(ctx)
})

export async function getPisByGroupCode(groupCode: number) {
  if (!groupCode) return []

  try {
    return db.projectIndividual.findMany({
      where: { deletedAt: null, deletedBy: null, projectGroup: { code: groupCode } },
      include: COMMON_PROJECT_INDIVIDUAL_INCLUDE,
      orderBy: COMMON_PROJECT_INDIVIDUAL_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisByGroupCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ groupCode: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return getPisByGroupCode(parsedInput.groupCode)
  })

export async function getPiByCode(code: number, userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!code || !userInfo || !userInfo.userId || !userInfo.userCode) return null

  const { userId, userCode, ability } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-projects-individuals')
    const canViweOwned = ability?.can('view (owner)', 'p-projects-individuals')

    const where: Prisma.ProjectIndividualWhereUniqueInput =
      !ability || canViewAll
        ? { code }
        : canViweOwned
          ? {
              code,
              OR: [
                { projectGroup: { projectGroupPics: { some: { userCode } } } },
                { projectIndividualCustomers: { some: { userCode } } },
                { projectIndividualPics: { some: { userCode } } },
                { createdBy: userId },
              ],
            }
          : { code: -1 }

    const projectIndividuals = await db.projectIndividual.findUnique({ where, include: COMMON_PROJECT_INDIVIDUAL_INCLUDE })

    if (!projectIndividuals) return null

    //TODO: separate the fetching of customers and pics into separate actions & hooks
    const [customers, suppliers, pics] = await Promise.all([
      db.projectIndividualCustomer.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
      db.projectIndividualSupplier.findMany({ where: { projectIndividualCode: code }, select: { supplierCode: true } }),
      db.projectIndividualPic.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
    ])

    return {
      ...projectIndividuals,
      customers: customers.map((c) => c.userCode),
      suppliers: suppliers.map((s) => s.supplierCode),
      pics: pics.map((p) => p.userCode),
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getPisByBpUserCode(userCode?: number | null) {
  try {
    if (!userCode) return []

    const projectIndividualCustomers = await db.projectIndividualCustomer.findMany({
      where: { userCode },
      orderBy: { user: { code: 'asc' } },
      select: { projectIndividual: true },
    })

    const result = projectIndividualCustomers.map((p) => p.projectIndividual)

    return result
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisByBpUserCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ userCode: z.coerce.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPisByBpUserCode(data.userCode)
  })

export const upsertPi = action
  .use(authenticationMiddleware)
  .schema(projectIndividualFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers, suppliers, pics, ...data } = parsedInput
    const { userId, userCode } = ctx

    const include: Prisma.ProjectIndividualInclude = {
      projectIndividualCustomers: {
        //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
        where: {
          user: {
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT INDIVIDUALS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
              {
                role: {
                  key: 'admin',
                },
              },
            ],
          },
        },
      },
      projectIndividualPics: {
        //* only return the pic that has role 'admin' or which they allowed to 'receive notifications (owner)' permission action
        where: {
          user: {
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT INDIVIDUALS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
              {
                role: {
                  key: 'admin',
                },
              },
            ],
          },
        },
      },
    }

    const trimmedName = data.name.trim()

    try {
      //* update project individual
      if (code !== -1) {
        const existingPi = await db.projectIndividual.findUnique({ where: { code }, include })

        if (!existingPi) {
          return { error: true, status: 404, message: 'Project individual not found!', action: 'UPSERT_PROJECT_INDIVIDUAL' }
        }

        if (existingPi.name !== trimmedName) {
          //* check if the name is already exists
          const existingPiName = await db.projectIndividual.findFirst({ where: { name: trimmedName, code: { not: existingPi.code } } })
          if (existingPiName) {
            return { error: true, status: 401, message: 'Project individual name already exists!', action: 'UPSERT_PROJECT_INDIVIDUAL' }
          }
        }

        const [updatedPi] = await db.$transaction([
          //* update project individual
          db.projectIndividual.update({
            where: { code },
            data: { ...data, name: trimmedName, updatedBy: userId },
          }),

          //* delete existing project individual customers
          db.projectIndividualCustomer.deleteMany({ where: { projectIndividualCode: code } }),

          //* create new project individual customers
          db.projectIndividualCustomer.createManyAndReturn({
            data: customers.map((c) => ({ projectIndividualCode: code, userCode: c })),
          }),

          //* delete existing project individual suppliers
          db.projectIndividualSupplier.deleteMany({ where: { projectIndividualCode: code } }),

          //* create new project individual suppliers
          db.projectIndividualSupplier.createManyAndReturn({
            data: suppliers.map((s) => ({ projectIndividualCode: code, supplierCode: s })),
          }),

          //* delete existing project individual pics
          db.projectIndividualPic.deleteMany({ where: { projectIndividualCode: code } }),

          //* create new project individual pics
          db.projectIndividualPic.createManyAndReturn({
            data: pics.map((p) => ({ projectIndividualCode: code, userCode: p })),
          }),
        ])

        //* create notifications
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //   title: 'Project Individual Updated',
        //   message: `A project individual (#${updatedPi.code}) was updated by ${ctx.fullName}.`,
        //   link: `/project/individuals/${updatedPi.code}/view`,
        //   entityType: 'ProjectIndividual' as Prisma.ModelName,
        //   entityCode: updatedPi.code,
        //   entityId: updatedPi.id,
        //   userCodes: [],
        // }).then((data) => {
        //   if (data.error) return

        //   const currentCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
        //   const newlyAssignedCustomers = customers.filter((customer) => !currentCustomers.includes(customer))
        //   const unAssignedCustomers = currentCustomers.filter((pic) => !customers.includes(pic))

        //   const currentPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)
        //   const newlyAssignedPics = pics.filter((pic) => !currentPics.includes(pic))
        //   const unAssignedPics = currentPics.filter((pic) => !pics.includes(pic))

        //   //* if the user is assigned or unassigned as a customer, then skip notify will be false to notify the user otherwise true
        //   const isNewlyAssignedCustomersIsSkipNotify = newlyAssignedCustomers.includes(ctx.userCode)
        //   const isUnassignedCustomersIsSkipNotify = unAssignedCustomers.includes(ctx.userCode)

        //   //* if the user is assigned or unassigned as a pic, then skip notify will be false to notify the user otherwise true
        //   const isNewlyAssignedPicsIsSkipNotify = newlyAssignedPics.includes(ctx.userCode)
        //   const isUnassignedPicsIsSkipNotify = unAssignedPics.includes(ctx.userCode)

        //   //* create notification for newly assigned customers
        //   if (newlyAssignedCustomers.length > 0) {
        //     void createNotification(
        //       ctx,
        //       {
        //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //         title: 'Project Individual Customer Assigned',
        //         message: `You were assigned as a customer to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
        //         link: `/project/individuals/${updatedPi.code}/view`,
        //         entityType: 'ProjectIndividual' as Prisma.ModelName,
        //         entityCode: updatedPi.code,
        //         entityId: updatedPi.id,
        //         userCodes: newlyAssignedCustomers,
        //       },
        //       { skipNotify: isNewlyAssignedCustomersIsSkipNotify ? false : true }
        //     )
        //   }

        //   //* create notification for unassigned customers
        //   if (unAssignedCustomers.length > 0) {
        //     void createNotification(
        //       ctx,
        //       {
        //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //         title: 'Project Individual Customer Unassigned',
        //         message: `You were unassigned as a customer to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
        //         link: `/project/individuals`,
        //         entityType: 'ProjectIndividual' as Prisma.ModelName,
        //         entityCode: updatedPi.code,
        //         entityId: updatedPi.id,
        //         userCodes: unAssignedCustomers,
        //       },
        //       { skipNotify: isUnassignedCustomersIsSkipNotify ? false : true }
        //     )
        //   }

        //   //* create notification for newly assigned pics
        //   if (newlyAssignedPics.length > 0) {
        //     void createNotification(
        //       ctx,
        //       {
        //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //         title: 'Project Individual PIC Assigned',
        //         message: `You were assigned as a PIC to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
        //         link: `/project/individuals/${updatedPi.code}/view`,
        //         entityType: 'ProjectIndividual' as Prisma.ModelName,
        //         entityCode: updatedPi.code,
        //         entityId: updatedPi.id,
        //         userCodes: newlyAssignedPics,
        //       },
        //       { skipNotify: isNewlyAssignedPicsIsSkipNotify ? false : true }
        //     )
        //   }

        //   //* create notification for unassigned pics
        //   if (unAssignedPics.length > 0) {
        //     void createNotification(
        //       ctx,
        //       {
        //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //         title: 'Project Individual PIC Unassigned',
        //         message: `You were unassigned as a PIC to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
        //         link: `/project/individuals`,
        //         entityType: 'ProjectIndividual' as Prisma.ModelName,
        //         entityCode: updatedPi.code,
        //         entityId: updatedPi.id,
        //         userCodes: unAssignedPics,
        //       },
        //       { skipNotify: isUnassignedPicsIsSkipNotify ? false : true }
        //     )
        //   }
        // })

        return {
          status: 200,
          message: 'Project individual updated successfully!',
          action: 'UPSERT_PROJECT_INDIVIDUAL',
          data: { projectIndividual: updatedPi },
        }
      }

      //* check if the name is already exists
      const existingPi = await db.projectIndividual.findFirst({ where: { name: trimmedName } })

      if (existingPi) {
        return { error: true, status: 401, message: 'Project individual name already exists!', action: 'UPSERT_PROJECT_INDIVIDUAL' }
      }

      //* create project individual
      const newPi = await db.projectIndividual.create({
        data: {
          ...data,
          name: trimmedName,
          projectIndividualCustomers: {
            createMany: { data: customers.map((c) => ({ userCode: c })) },
          },
          projectIndividualSuppliers: {
            createMany: { data: suppliers.map((s) => ({ supplierCode: s })) },
          },
          projectIndividualPics: {
            createMany: { data: pics.map((p) => ({ userCode: p })) },
          },
          createdBy: userId,
          updatedBy: userId,
        },
        include,
      })

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Created',
      //   message: `A new project individual (#${newPi.code}) was created by ${ctx.fullName}.`,
      //   link: `/project/individuals/${newPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: newPi.code,
      //   entityId: newPi.id,
      //   userCodes: [],
      // }).then((data) => {
      //   if (data.error) return

      //   //* only notify when notification of created project individual was successful
      //   //* notify assigned customers & pics

      //   const assignedCustomers = newPi.projectIndividualCustomers.map((pc) => pc.userCode)
      //   const assignedPics = newPi.projectIndividualPics.map((pp) => pp.userCode)

      //   //* if the user is assigned as a customer or pic, then skip notify will be false to notify the user otherwise true
      //   const isAssignedCustomersSkipNotify = assignedCustomers.includes(userCode)
      //   const isAssignedPicsSkipNotify = assignedPics.includes(userCode)

      //   //* create notification for assigned customers
      //   if (assignedCustomers.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual Customer Assigned',
      //         message: `You were assigned as a customer to project individual (#${newPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals/${newPi.code}/view`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: newPi.code,
      //         entityId: newPi.id,
      //         userCodes: assignedCustomers,
      //       },
      //       { skipNotify: isAssignedCustomersSkipNotify ? false : true }
      //     )
      //   }

      //   //* create notification for assigned pics
      //   if (assignedPics.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual PIC Assigned',
      //         message: `You were assigned as a PIC to project individual (#${newPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals/${newPi.code}/view`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: newPi.code,
      //         entityId: newPi.id,
      //         userCodes: assignedPics,
      //       },
      //       { skipNotify: isAssignedPicsSkipNotify ? false : true }
      //     )
      //   }
      // })

      return {
        status: 200,
        message: 'Project individual created successfully!',
        action: 'UPSERT_PROJECT_INDIVIDUAL',
        data: { projectIndividual: newPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_PROJECT_INDIVIDUAL',
      }
    }
  })

export const deleletePi = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code: data.code } })

      if (!projectIndividual)
        return { error: true, status: 404, message: 'Project individual not found!', action: 'DELETE_PROJECT_INDIVIDUAL' }

      await db.projectIndividual.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Deleted',
      //   message: `A project individual (#${projectIndividual.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/project/individuals/${projectIndividual.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: projectIndividual.code,
      //   entityId: projectIndividual.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Project individual deleted successfully!', action: 'DELETE_PROJECT_INDIVIDUAL' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        action: 'DELETE_PROJECT_INDIVIDUAL',
      }
    }
  })

export const restorePi = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code: data.code } })

      if (!projectIndividual) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'RESTORE_PROJECT_INDIVIDUAL' }
      }

      await db.projectIndividual.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Restored',
      //   message: `A project individual (#${projectIndividual.code}) was restored by ${ctx.fullName}.`,
      //   link: `/project/individuals/${projectIndividual.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: projectIndividual.code,
      //   entityId: projectIndividual.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Project individual retored successfully!', action: 'RESTORE_PROJECT_INDIVIDUAL' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_PROJECT_INDIVIDUAL',
      }
    }
  })

export const importPis = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow } = parsedInput
    const { userId } = ctx

    const names = data?.map((row) => row?.['Name']?.trim())?.filter(Boolean) || []

    try {
      const batch: Prisma.ProjectIndividualCreateManyInput[] = []
      const toBeCreatedNames: string[] = [] //* contains toBeCreated project individual names

      //* get existing project individual names
      const existingPiNames = await db.projectIndividual
        .findMany({
          where: { name: { in: names } },
          select: { name: true },
        })
        .then((pis) => pis.map((pi) => pi.name))

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const trimmedName = row?.['Name']?.trim()

        //* check required fields
        if (!trimmedName) errors.push({ field: 'Name', message: 'Missing required field' })

        //* check if project individual name already exists
        if (existingPiNames.includes(trimmedName) || toBeCreatedNames.includes(trimmedName)) {
          errors.push({ field: 'Name', message: 'Name already exists' })
        }

        //* if errors array is not empty, then update/push to importErrors
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* add to be create project group names
        toBeCreatedNames.push(trimmedName)

        //* reshape data
        const toCreate: Prisma.ProjectIndividualCreateManyInput = {
          name: trimmedName,
          groupCode: safeParseInt(row?.['Group ID']) || null,
          description: row?.['Description'] || null,
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.projectIndividual.createMany({
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

      // if (updatedStats.status === 'completed') {
      //   //* create notification
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //     title: 'Project Individual Imported',
      //     message: `New project individual${total > 1 ? 's were' : ' was'} imported by ${ctx.fullName}.`,
      //     link: `/project/individuals`,
      //     entityType: 'ProjectIndividual' as Prisma.ModelName,
      //     userCodes: [],
      //   })
      // }

      return {
        status: 200,
        message: `${updatedStats.completed} project individual created successfully!`,
        action: 'IMPORT_PROJECT_INDIVIDUALS',
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
        action: 'IMPORT_PROJECT_INDIVIDUALS',
        stats,
      }
    }
  })

export const updatePiCustomers = action
  .use(authenticationMiddleware)
  .schema(projectIndividualCustomerFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers } = parsedInput
    const { userId } = ctx

    const include: Prisma.ProjectIndividualInclude = {
      projectIndividualCustomers: {
        //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
        where: {
          user: {
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT INDIVIDUALS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
              {
                role: {
                  key: 'admin',
                },
              },
            ],
          },
        },
      },
    }

    try {
      const pi = await db.projectIndividual.findUnique({ where: { code }, include })

      if (!pi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS' }
      }

      //* update project individual
      const [updatedPi] = await db.$transaction([
        //* update project individual
        db.projectIndividual.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project individual customers
        db.projectIndividualCustomer.deleteMany({ where: { projectIndividualCode: code } }),

        //* create new project individual customers
        db.projectIndividualCustomer.createManyAndReturn({
          data: customers.map((c) => ({ projectIndividualCode: code, userCode: c })),
        }),
      ])

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Updated',
      //   message: `A project individual (#${updatedPi.code}) was updated by ${ctx.fullName}.`,
      //   link: `/project/individuals/${updatedPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: updatedPi.code,
      //   entityId: updatedPi.id,
      //   userCodes: [],
      // }).then((data) => {
      //   if (data.error) return

      //   const currentCustomers = pi.projectIndividualCustomers.map((pic) => pic.userCode)
      //   const newlyAssignedCustomers = customers.filter((customer) => !currentCustomers.includes(customer))
      //   const unAssignedCustomers = currentCustomers.filter((pic) => !customers.includes(pic))

      //   //* if the user is assigned or unassigned as a customer, then skip notify will be false to notify the user otherwise true
      //   const isNewlyAssignedCustomersIsSkipNotify = newlyAssignedCustomers.includes(ctx.userCode)
      //   const isUnassignedCustomersIsSkipNotify = unAssignedCustomers.includes(ctx.userCode)

      //   //* create notification for newly assigned customers
      //   if (newlyAssignedCustomers.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual Customer Assigned',
      //         message: `You were assigned as a customer to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals/${updatedPi.code}/view`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: updatedPi.code,
      //         entityId: updatedPi.id,
      //         userCodes: newlyAssignedCustomers,
      //       },
      //       { skipNotify: isNewlyAssignedCustomersIsSkipNotify ? false : true }
      //     )
      //   }

      //   //* create notification for unassigned customers
      //   if (unAssignedCustomers.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual Customer Unassigned',
      //         message: `You were unassigned as a customer to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: updatedPi.code,
      //         entityId: updatedPi.id,
      //         userCodes: unAssignedCustomers,
      //       },
      //       { skipNotify: isUnassignedCustomersIsSkipNotify ? false : true }
      //     )
      //   }
      // })

      return {
        status: 200,
        message: `Project individual's customers updated successfully!`,
        action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS',
        data: { projectIndividual: updatedPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS',
      }
    }
  })

export const updatePiSuppliers = action
  .use(authenticationMiddleware)
  .schema(projectIndividualSupplierFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, suppliers } = parsedInput
    const { userId } = ctx

    try {
      const pi = await db.projectIndividual.findUnique({ where: { code } })

      if (!pi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPDATE_PROJECT_INDIVIDUAL_SUPPLIERS' }
      }

      //* update project individual
      const [updatedPi] = await db.$transaction([
        //* update project individual
        db.projectIndividual.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project individual suppliers
        db.projectIndividualSupplier.deleteMany({ where: { projectIndividualCode: code } }),

        //* create new project individual suppliers
        db.projectIndividualSupplier.createManyAndReturn({
          data: suppliers.map((s) => ({ projectIndividualCode: code, supplierCode: s })),
        }),
      ])

      return {
        status: 200,
        message: `Project individual's suppliers updated successfully!`,
        action: 'UPDATE_PROJECT_INDIVIDUAL_SUPPLIERS',
        data: { projectIndividual: updatedPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_INDIVIDUAL_SUPPLIERS',
      }
    }
  })

export const updatePiPics = action
  .use(authenticationMiddleware)
  .schema(projectIndividualPicFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, pics } = parsedInput
    const { userId } = ctx

    const include: Prisma.ProjectIndividualInclude = {
      projectIndividualPics: {
        //* only return the pic that has role 'admin' or which they allowed to 'receive notifications (owner)' permission action
        where: {
          user: {
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT INDIVIDUALS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
              {
                role: {
                  key: 'admin',
                },
              },
            ],
          },
        },
      },
    }

    try {
      const pi = await db.projectIndividual.findUnique({ where: { code }, include })

      if (!pi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPDATE_PROJECT_INDIVIDUAL_PICS' }
      }

      //* update project individual
      const [updatedPi] = await db.$transaction([
        //* update project individual
        db.projectIndividual.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project individual pics
        db.projectIndividualPic.deleteMany({ where: { projectIndividualCode: code } }),

        //* create new project individual pics
        db.projectIndividualPic.createManyAndReturn({
          data: pics.map((p) => ({ projectIndividualCode: code, userCode: p })),
        }),
      ])

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Updated',
      //   message: `A project individual (#${updatedPi.code}) was updated by ${ctx.fullName}.`,
      //   link: `/project/individuals/${updatedPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: updatedPi.code,
      //   entityId: updatedPi.id,
      //   userCodes: [],
      // }).then((data) => {
      //   if (data.error) return

      //   const currentPics = pi.projectIndividualPics.map((pip) => pip.userCode)
      //   const newlyAssignedPics = pics.filter((pic) => !currentPics.includes(pic))
      //   const unAssignedPics = currentPics.filter((pic) => !pics.includes(pic))

      //   //* if the user is assigned or unassigned as a pic, then skip notify will be false to notify the user otherwise true
      //   const isNewlyAssignedPicsIsSkipNotify = newlyAssignedPics.includes(ctx.userCode)
      //   const isUnassignedPicsIsSkipNotify = unAssignedPics.includes(ctx.userCode)

      //   //* create notification for newly assigned pics
      //   if (newlyAssignedPics.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual PIC Assigned',
      //         message: `You were assigned as a PIC to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals/${updatedPi.code}/view`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: updatedPi.code,
      //         entityId: updatedPi.id,
      //         userCodes: newlyAssignedPics,
      //       },
      //       { skipNotify: isNewlyAssignedPicsIsSkipNotify ? false : true }
      //     )
      //   }

      //   //* create notification for unassigned pics
      //   if (unAssignedPics.length > 0) {
      //     void createNotification(
      //       ctx,
      //       {
      //         permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //         title: 'Project Individual PIC Unassigned',
      //         message: `You were unassigned as a PIC to project individual (#${updatedPi.code}) by ${ctx.fullName}.`,
      //         link: `/project/individuals`,
      //         entityType: 'ProjectIndividual' as Prisma.ModelName,
      //         entityCode: updatedPi.code,
      //         entityId: updatedPi.id,
      //         userCodes: unAssignedPics,
      //       },
      //       { skipNotify: isUnassignedPicsIsSkipNotify ? false : true }
      //     )
      //   }
      // })

      return {
        status: 200,
        message: `Project individual's PICs updated successfully!`,
        action: 'UPDATE_PROJECT_INDIVIDUAL_PICS',
        data: { projectIndividual: updatedPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_INDIVIDUAL_PICS',
      }
    }
  })

export const updateCustomerPis = action
  .use(authenticationMiddleware)
  .schema(customerProjectIndividualsFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, projects } = parsedInput
    const { userId } = ctx

    const include: Prisma.ProjectIndividualInclude = {
      projectIndividualPics: {
        //* only return the pic that has role 'admin' or which they allowed to 'receive notifications (owner)' permission action
        where: {
          user: {
            OR: [
              {
                role: {
                  rolePermissions: {
                    some: {
                      permission: { code: PERMISSIONS_CODES['PROJECT INDIVIDUALS'] },
                      actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER },
                    },
                  },
                },
              },
              {
                role: {
                  key: 'admin',
                },
              },
            ],
          },
        },
      },
    }

    try {
      const currentAssignedPis = (
        await db.projectIndividualCustomer.findMany({
          where: { userCode: code },
          select: { projectIndividual: { select: { code: true, name: true } } },
        })
      ).map((pc) => pc.projectIndividual.code)
      const newlyAssignedPis = projects.filter((pi) => !currentAssignedPis.includes(pi))
      const unAssignedPis = currentAssignedPis.filter((pi) => !projects.includes(pi))

      const updatedPis = await db.$transaction(async (tx) => {
        //* update project individuals
        await tx.projectIndividual.updateMany({
          where: { code: { in: [...newlyAssignedPis, ...unAssignedPis] } },
          data: { updatedBy: userId },
        })

        //* delete the project individual customers which based on the unAssignedPis
        await tx.projectIndividualCustomer.deleteMany({
          where: {
            projectIndividualCode: { in: unAssignedPis },
            userCode: code,
          },
        })

        //* create the project individual customers which based on the newlyAssignedPis
        await tx.projectIndividualCustomer.createMany({
          data: newlyAssignedPis.map((pi) => ({ projectIndividualCode: pi, userCode: code })),
        })

        return await tx.projectIndividual.findMany({
          where: { code: { in: [...newlyAssignedPis, ...unAssignedPis] } },
          include,
        })
      })

      // TODO: Need more testing on this
      // updatedPis.forEach((uPi) => {
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //     title: 'Project Individual Updated',
      //     message: `A project individual (#${uPi.code}) was updated by ${ctx.fullName}.`,
      //     link: `/project/individuals/${uPi.code}/view`,
      //     entityType: 'ProjectIndividual' as Prisma.ModelName,
      //     entityCode: uPi.code,
      //     entityId: uPi.id,
      //     userCodes: [],
      //   }).then((data) => {
      //     if (data.error) return

      //     const assignedPics = uPi.projectIndividualPics.map((pip) => pip.userCode)
      //     const isNewlyAssigned = newlyAssignedPis.includes(uPi.code)
      //     const isSkipNotify = ctx.userCode === code
      //     const isUnassigned = unAssignedPis.includes(uPi.code)

      //     //* create notification for newly assigned customer
      //     if (isNewlyAssigned) {
      //       void createNotification(
      //         ctx,
      //         {
      //           permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //           title: 'Project Individual Customer Assigned',
      //           message: `You were assigned as a customer to project individual (#${uPi.code}) by ${ctx.fullName}.`,
      //           link: `/project/individuals/${uPi.code}/view`,
      //           entityType: 'ProjectIndividual' as Prisma.ModelName,
      //           entityCode: uPi.code,
      //           entityId: uPi.id,
      //           userCodes: [code, ...assignedPics],
      //         },
      //         { skipNotify: isSkipNotify ? false : true }
      //       )
      //     }

      //     //* create notification for unassigned customer
      //     if (isUnassigned) {
      //       void createNotification(
      //         ctx,
      //         {
      //           permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //           title: 'Project Individual Customer Unassigned',
      //           message: `You were unassigned as a customer to project individual (#${uPi.code}) by ${ctx.fullName}.`,
      //           link: `/project/individuals`,
      //           entityType: 'ProjectIndividual' as Prisma.ModelName,
      //           entityCode: uPi.code,
      //           entityId: uPi.id,
      //           userCodes: [code, ...assignedPics],
      //         },
      //         { skipNotify: isSkipNotify ? false : true }
      //       )
      //     }
      //   })
      // })

      return {
        status: 200,
        message: `${newlyAssignedPis.length} project individual(s) assigned and ${unAssignedPis.length} project individual(s) unassigned successfully!`,
        action: 'UPDATE_CUSTOMER_PROJECT_INDIVIDUALS',
        data: { projectIndividual: updatedPis },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_CUSTOMER_PROJECT_INDIVIDUALS',
      }
    }
  })
