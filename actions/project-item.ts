'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { isValid, parse } from 'date-fns'
import { subtract } from 'mathjs'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { deleteProjectItemsFormSchema, projectItemFormSchema, restoreProjectItemsFormSchema } from '@/schema/project-item'
import { paramsSchema } from '@/schema/common'
import { safeParseFloat, safeParseInt } from '@/utils'
import { importFormSchema } from '@/schema/import'
import { ImportSyncErrorEntry } from '@/types/common'
import { PERMISSIONS_ALLOWED_ACTIONS, PERMISSIONS_CODES } from '@/constants/permission'
import { createNotification } from './notification'

const COMMON_PROJECT_ITEM_INCLUDE = {
  item: true,
  dateReceivedByUser: { select: { fname: true, lname: true } },
  warehouse: { select: { code: true, name: true, description: true } },
} satisfies Prisma.ProjectItemInclude

const COMMON_PROJECT_ITEM_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectItemOrderByWithRelationInput

export async function getProjecItems(projectCode: number, isHideDeleted = true) {
  if (!projectCode) return []

  try {
    const result = await db.projectItem.findMany({
      where: { projectIndividualCode: projectCode, ...(isHideDeleted ? { deletedAt: null, deletedBy: null } : {}) },
      include: COMMON_PROJECT_ITEM_INCLUDE,
      orderBy: COMMON_PROJECT_ITEM_ORDER_BY,
    })

    return result.map((item) => ({
      ...item,
      cost: safeParseFloat(item.cost),
      availableToOrder: subtract(safeParseFloat(item.totalStock), safeParseFloat(item.stockIn)),
      stockIn: safeParseInt(item.stockIn),
      stockOut: safeParseFloat(item.stockOut),
      totalStock: safeParseFloat(item.totalStock),
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getProjecItemsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ projectCode: z.number(), isHideDeleted: z.boolean().optional() }))
  .action(async ({ parsedInput: data }) => {
    return getProjecItems(data.projectCode, data.isHideDeleted)
  })

export async function getProjectItemByCode(code: number) {
  if (!code) return null

  try {
    return db.projectItem.findUnique({
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

    try {
      const existingPi = await db.projectIndividual.findUnique({ where: { code: data.projectIndividualCode }, include })

      if (!existingPi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPSERT_PROJECT_ITEM' }
      }

      const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
      const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

      //* update item
      if (code !== -1) {
        //* update project item
        const updatedItem = await db.projectItem.update({ where: { code }, data: { ...data, updatedBy: userId } })

        //* create notifications
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //   title: 'Project Individual Inventory Updated',
        //   message: `A new project individual inventory (#${updatedItem.code}) was updated by ${ctx.fullName}.`,
        //   link: `/project/individuals/${existingPi.code}/view`,
        //   entityType: 'ProjectIndividual' as Prisma.ModelName,
        //   entityCode: existingPi.code,
        //   entityId: existingPi.id,
        //   userCodes: [...assignedCustomers, ...assignedPics],
        // })

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

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Inventory Created',
      //   message: `A new project individual inventory (#${newItem.code}) was created by ${ctx.fullName}.`,
      //   link: `/project/individuals/${existingPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: existingPi.code,
      //   entityId: existingPi.id,
      //   userCodes: [...assignedCustomers, ...assignedPics],
      // })

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
  .schema(paramsSchema.merge(z.object({ isPermanent: z.boolean().optional() })))
  .action(async ({ ctx, parsedInput: data }) => {
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

    try {
      const projectItem = await db.projectItem.findUnique({ where: { code: data.code } })

      if (!projectItem) return { error: true, status: 404, message: 'Project item not found!', action: 'DELETE_PROJECT_ITEM' }

      const existingPi = await db.projectIndividual.findUnique({ where: { code: projectItem.projectIndividualCode }, include })

      if (!existingPi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'DELETE_PROJECT_ITEM' }
      }

      //* soft delete or permanent delete
      if (data.isPermanent) {
        await db.projectItem.delete({ where: { code: data.code } })
      } else await db.projectItem.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
      const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Inventory Deleted',
      //   message: `A project individual inventory (#${projectItem.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/project/individuals/${existingPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: existingPi.code,
      //   entityId: existingPi.id,
      //   userCodes: [...assignedCustomers, ...assignedPics],
      // })

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

export const deleteProjectItems = action
  .use(authenticationMiddleware)
  .schema(deleteProjectItemsFormSchema)
  .action(async ({ ctx, parsedInput: data }) => {
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

    try {
      if (data.codes.length < 1) {
        return { error: true, status: 400, message: 'Please select at least one item to delete!', action: 'DELETE_PROJECT_ITEMS' }
      }

      const existingPi = await db.projectIndividual.findUnique({ where: { code: data.projectCode }, include })

      if (!existingPi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'DELETE_PROJECT_ITEMS' }
      }

      let completed = 0

      if (data.isPermanent) {
        const deletedItems = await db.projectItem.deleteMany({
          where: { code: { in: data.codes }, deletedAt: { not: null }, deletedBy: { not: null } },
        })
        completed = deletedItems.count
      } else {
        const updatedItems = await db.projectItem.updateMany({
          where: { code: { in: data.codes }, deletedAt: null, deletedBy: null },
          data: { deletedAt: new Date(), deletedBy: ctx.userId },
        })
        completed = updatedItems.count
      }

      // const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
      // const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Inventory Deleted',
      //   message: `${completed} of project individual inventor${completed === 1 ? 'y was' : 'ies were'}  deleted by ${ctx.fullName}.`,
      //   link: `/project/individuals/${data.projectCode}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   userCodes: [...assignedCustomers, ...assignedPics],
      // })

      return { status: 200, message: `Item${completed === 1 ? '' : 's'} deleted successfully!`, action: 'DELETE_PROJECT_ITEMS' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_PROJECT_ITEMS',
      }
    }
  })

export const restoreProjectItems = action
  .use(authenticationMiddleware)
  .schema(restoreProjectItemsFormSchema)
  .action(async ({ ctx, parsedInput: data }) => {
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

    try {
      if (data.codes.length < 1) {
        return { error: true, status: 400, message: 'Please select at least one item to restore!', action: 'RESTORE_PROJECT_ITEMS' }
      }

      const existingPi = await db.projectIndividual.findUnique({ where: { code: data.projectCode }, include })

      if (!existingPi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'RESTORE_PROJECT_ITEMS' }
      }

      let completed = 0

      const updatedItems = await db.projectItem.updateMany({
        where: { code: { in: data.codes }, deletedAt: { not: null }, deletedBy: { not: null } },
        data: { deletedAt: null, deletedBy: null },
      })

      completed = updatedItems.count

      // const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
      // const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Inventory Restored',
      //   message: `${completed} of project individual inventor${completed === 1 ? 'y was' : 'ies were'}  restored by ${ctx.fullName}.`,
      //   link: `/project/individuals/${data.projectCode}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   userCodes: [...assignedCustomers, ...assignedPics],
      // })

      return { status: 200, message: `Item${completed === 1 ? '' : 's'} restored successfully!`, action: 'RESTORE_PROJECT_ITEMS' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_PROJECT_ITEMS',
      }
    }
  })

export const restoreProjectItem = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
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

    try {
      const projectItem = await db.projectItem.findUnique({ where: { code: data.code } })

      if (!projectItem) return { error: true, status: 404, message: 'Project item not found!', action: 'RESTORE_PROJECT_ITEM' }

      const existingPi = await db.projectIndividual.findUnique({ where: { code: projectItem.projectIndividualCode }, include })

      if (!existingPi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'RESTORE_PROJECT_ITEM' }
      }

      await db.projectItem.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } }) //* soft delete

      const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
      const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

      //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
      //   title: 'Project Individual Inventory Restored',
      //   message: `A project individual inventory (#${projectItem.code}) was restored by ${ctx.fullName}.`,
      //   link: `/project/individuals/${existingPi.code}/view`,
      //   entityType: 'ProjectIndividual' as Prisma.ModelName,
      //   entityCode: existingPi.code,
      //   entityId: existingPi.id,
      //   userCodes: [...assignedCustomers, ...assignedPics],
      // })

      return { status: 200, message: 'Item restored successfully!', action: 'RESTORE_PROJECT_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_PROJECT_ITEM',
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

    const existingPi = await db.projectIndividual.findUnique({ where: { code: projectCode }, include })

    if (!existingPi) {
      throw { error: true, status: 404, message: 'Project individual not found!', action: 'IMPORT_PROJECT_ITEMS' }
    }

    try {
      const batch: Prisma.ProjectItemCreateManyInput[] = []

      //* get existing items
      const existingItems = await db.item.findMany({
        where: { ItemCode: { in: uniqueMpns } },
        select: { code: true, ItemCode: true },
      })

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const baseItem = existingItems.find((item) => item.ItemCode === row?.['MFG_P/N'])

        //* check required fields
        if (!row?.['MFG_P/N']) errors.push({ field: 'MFG P/N', message: 'Missing required field' })

        //* check if project code is provided
        if (!projectCode) errors.push({ field: 'Project Code', message: 'Project code not found' })

        //* check if MFG_P/N of an item exist in the db
        if (row?.['MFG_P/N'] && !baseItem) errors.push({ field: 'MFG P/N', message: 'MFG P/N does not exist' })

        //* check if date received provided and its is a valid  date
        if (row?.['Date_Received'] && !isValid(parse(row?.['Date_Received'], 'MM/dd/yyyy', new Date()))) {
          errors.push({ field: 'Date_Received', message: 'Date received is not a valid date' })
        }

        //* check if total stock provided is valid
        if (safeParseInt(row?.['Total_Stock']) < 1) errors.push({ field: 'Total Stock', message: 'Total stock is invalid' })

        //* if errors array is not empty, then update/push to stats.error
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* reshape data
        const toCreate: Prisma.ProjectItemCreateManyInput = {
          code: safeParseInt(row?.['ID']) || -1,
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

      //* upsert the batch -  if batch ID is equal to -1 (non-existent ID) then create, else update
      await db.$transaction(
        batch.map((b) => {
          const { code, ...bData } = b
          return db.projectItem.upsert({
            where: { code },
            create: bData,
            update: bData,
          })
        })
      )

      const progress = ((stats.completed + batch.length) / total) * 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + batch.length,
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      if (updatedStats.status === 'completed') {
        const assignedCustomers = existingPi.projectIndividualCustomers.map((pic) => pic.userCode)
        const assignedPics = existingPi.projectIndividualPics.map((pip) => pip.userCode)

        //* create notifications
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES['PROJECT INDIVIDUALS'],
        //   title: 'Project Individual Inventory Imported',
        //   message: `New project individual inventor${total > 1 ? 'ies were' : 'y was'} imported by ${ctx.fullName}.`,
        //   link: `/project/individuals/${existingPi.code}/view`,
        //   entityType: 'ProjectIndividual' as Prisma.ModelName,
        //   entityCode: existingPi.code,
        //   entityId: existingPi.id,
        //   userCodes: [...assignedCustomers, ...assignedPics],
        // })
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
