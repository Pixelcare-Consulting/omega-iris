'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import {
  deleteWorkOrderLineItemFormSchema,
  upsertWorkOrderLineItemFormSchema,
  upsertWorkOrderLineItemsFormSchema,
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_VALUE_MAP,
  workOrderFormSchema,
  workOrderStatusUpdateFormSchema,
} from '@/schema/work-order'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { safeParseInt } from '@/utils'
import { getCurrentUserAbility } from './auth'
import { PERMISSIONS_ALLOWED_ACTIONS, PERMISSIONS_CODES } from '@/constants/permission'
import { createNotification } from './notification'

const COMMON_WORK_ORDER_INCLUDE = {
  projectIndividual: {
    select: {
      code: true,
      name: true,
      projectGroup: { select: { code: true, name: true } },
    },
  },
  user: { select: { code: true, fname: true, lname: true, email: true, customerCode: true } },
} satisfies Prisma.WorkOrderInclude

const COMMON_WORK_ORDER_ORDER_BY = { createdAt: 'desc' } satisfies Prisma.WorkOrderOrderByWithRelationInput

export async function getWorkOrders(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { userId, userCode, ability, roleKey } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-work-orders')
    const canViweOwned = ability?.can('view (owner)', 'p-work-orders')

    const where: Prisma.WorkOrderWhereInput | undefined =
      !ability || canViewAll
        ? undefined
        : canViweOwned
          ? {
              OR: [{ userCode }, { projectIndividual: { projectIndividualPics: { some: { userCode } } } }, { createdBy: userId }],
              ...(roleKey === 'business-partner' ? { isInternal: false } : {}),
            }
          : { userCode: -1 }

    return db.workOrder.findMany({ include: COMMON_WORK_ORDER_INCLUDE, orderBy: COMMON_WORK_ORDER_ORDER_BY, where })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getWorkOrderByCode(code: number, userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!code || !userInfo || !userInfo.userId || !userInfo.userCode) return null

  const { userId, userCode, roleKey, ability } = userInfo

  try {
    const canViewAll = ability?.can('view', 'p-projects-groups')
    const canViweOwned = ability?.can('view (owner)', 'p-projects-groups')

    const where: Prisma.WorkOrderWhereUniqueInput =
      !ability || canViewAll
        ? { code }
        : canViweOwned
          ? {
              code,
              OR: [{ userCode }, { projectIndividual: { projectIndividualPics: { some: { userCode } } } }, { createdBy: userId }],
              ...(roleKey === 'business-partner' ? { isInternal: false } : {}),
            }
          : { code: -1 }

    return db.workOrder.findUnique({ where, include: COMMON_WORK_ORDER_INCLUDE })
  } catch (error) {
    console.error(error)
    return null
  }
}

type CreditStockParams = {
  tx: Prisma.TransactionClient
  workOrderCode: number
  prevStatus: string | null
  currStatus: string
  deliveredProjectItems: number[]
}

export async function creditStock(params: CreditStockParams) {
  try {
    const { tx, workOrderCode, prevStatus, currStatus, deliveredProjectItems } = params

    const oldStatus = safeParseInt(prevStatus)
    const newStatus = safeParseInt(currStatus)

    //* check status
    if (!newStatus) {
      return {
        error: true,
        status: 400,
        message: 'Failed to credit stock due to invalid status!',
        action: 'CREDIT_STOCK',
      }
    }

    //* check work order code
    if (!workOrderCode) {
      return {
        error: true,
        status: 400,
        message: 'Failed to credit stock due to missing work order code!',
        action: 'CREDIT_STOCK',
      }
    }

    const existingWorkOrder = await tx.workOrder.findUnique({
      where: { code: workOrderCode },
      include: { workOrderItems: { include: { projectItem: true } } },
    })

    // //* check work order exist
    if (!existingWorkOrder) {
      return {
        error: true,
        status: 404,
        message: 'Failed to credit stock due to missing work order!',
        action: 'CREDIT_STOCK',
      }
    }

    //* check line items exist
    if (existingWorkOrder.workOrderItems.length < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to credit stock due to missing work order items!',
        action: 'CREDIT_STOCK',
      }
    }

    //* credit stock base on status:
    //? 1 - Open (stock-in - in process)
    //? 2 - Pending (stock-in - in process)
    //? 3 - In Process (stock-in - in process)
    //? 4 - Verified (stock-in - in process)
    //? 5 - Partial Delivery (stock-out - delivered)
    //? 6 - Delivered (stock-out - delivered)
    //? 7 - Cancelled - do nothing
    //? 8 - Deleted - do nothing

    const lineItems = existingWorkOrder.workOrderItems

    //* only credit stocks-in only when new status is 'In Process' and old is between 'Open' and 'Pending'
    if (
      oldStatus >= WORK_ORDER_STATUS_VALUE_MAP.Open &&
      oldStatus <= WORK_ORDER_STATUS_VALUE_MAP['Pending'] &&
      newStatus == WORK_ORDER_STATUS_VALUE_MAP['In Process']
    ) {
      //* credit stock
      await Promise.all(
        lineItems.map((li) => {
          const pItem = li.projectItem
          const qty = safeParseInt(li.qty)

          return tx.projectItem.update({
            where: { code: pItem.code },
            data: { stockIn: { increment: qty } },
          })
        })
      )

      return
    }

    //* if has old status and new status is between or equal 'Open' and 'Verified', then do nothing
    if (
      oldStatus !== 0 &&
      oldStatus >= WORK_ORDER_STATUS_VALUE_MAP['Open'] &&
      oldStatus <= WORK_ORDER_STATUS_VALUE_MAP['Verified'] &&
      newStatus >= WORK_ORDER_STATUS_VALUE_MAP['Open'] &&
      newStatus <= WORK_ORDER_STATUS_VALUE_MAP['Verified']
    ) {
      return
    }

    //* if old status is 'Verified' and current status is 'Partial Delivery or old status is 'Partial Delivery'
    //* then credit qty of the items that has beed mark as delivered to stock-in and debit total stock accordingly
    //* once item is already marked as delivered, will not be included
    if (
      (oldStatus === WORK_ORDER_STATUS_VALUE_MAP['Verified'] || oldStatus === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery']) &&
      newStatus === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery']
    ) {
      //* process only the line items that has isDelivered = false and included in deliveredProjectItems
      const lineItemsToProcess = lineItems.filter((li) => !li.isDelivered && deliveredProjectItems.includes(li.projectItem.code))

      //* update isDelivered to true of work order items
      await Promise.all(
        lineItemsToProcess.map((li) => {
          return tx.workOrderItem.update({
            where: {
              workOrderCode_projectItemCode: {
                workOrderCode: li.workOrderCode,
                projectItemCode: li.projectItemCode,
              },
            },
            data: { isDelivered: true },
          })
        })
      )

      //* debit stock-in & credit stock-out and debit total stock
      await Promise.all(
        lineItemsToProcess.map((li) => {
          const pItem = li.projectItem
          const qty = safeParseInt(li.qty)

          return tx.projectItem.update({
            where: { code: pItem.code },
            data: {
              stockIn: { decrement: qty },
              stockOut: { increment: qty },
              totalStock: { decrement: qty },
            },
          })
        })
      )

      return
    }

    //* if old status is 'Verified' or 'Partial Delivery' and new status is = 'Delivered'
    //* then credit qty of the items that isDelivered = false to stock-in and debit stock-in & total stock accordingly
    //* once item is already marked as delivered, will not be included
    if (
      (oldStatus === WORK_ORDER_STATUS_VALUE_MAP['Verified'] || oldStatus === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery']) &&
      newStatus === WORK_ORDER_STATUS_VALUE_MAP['Delivered']
    ) {
      //* process only the line items that has isDelivered = false
      //? deliveredProjectItems is not being used here
      const lineItemsToProcess = lineItems.filter((li) => !li.isDelivered)

      //* update isDelivered to true of work order items
      await Promise.all(
        lineItemsToProcess.map((li) => {
          return tx.workOrderItem.update({
            where: {
              workOrderCode_projectItemCode: {
                workOrderCode: li.workOrderCode,
                projectItemCode: li.projectItemCode,
              },
            },
            data: { isDelivered: true },
          })
        })
      )

      //* credit stock-in & debit stock-out & total stock
      await Promise.all(
        lineItemsToProcess.map((li) => {
          const pItem = li.projectItem
          const qty = safeParseInt(li.qty)

          return tx.projectItem.update({
            where: { code: pItem.code },
            data: {
              stockIn: { decrement: qty },
              stockOut: { increment: qty },
              totalStock: { decrement: qty },
            },
          })
        })
      )

      return
    }

    //* rollback on Cancelled / Deleted
    if (newStatus === WORK_ORDER_STATUS_VALUE_MAP['Cancelled'] || newStatus === WORK_ORDER_STATUS_VALUE_MAP['Deleted']) {
      //* if between or equal to 'In Process' and 'Verified' and then cancel or delete, then rollback stock
      if (oldStatus >= WORK_ORDER_STATUS_VALUE_MAP['In Process'] && oldStatus <= WORK_ORDER_STATUS_VALUE_MAP['Verified']) {
        await Promise.all(
          lineItems.map((li) => {
            const pItem = li.projectItem
            const qty = safeParseInt(li.qty)

            return tx.projectItem.update({
              where: { code: pItem.code },
              data: { stockIn: { decrement: qty } },
            })
          })
        )

        return
      }

      //* if oldStatus is between or equal 'Partial Delivery' and 'Delivered' and then cancel or delete, then rollback stock
      //* only process line items that has isDelivered = true
      if (oldStatus >= WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'] && oldStatus <= WORK_ORDER_STATUS_VALUE_MAP['Delivered']) {
        const lineItemsToProcess = lineItems.filter((li) => li.isDelivered)

        //* update isDelivered to false of work order items
        await Promise.all(
          lineItemsToProcess.map((li) => {
            return tx.workOrderItem.update({
              where: {
                workOrderCode_projectItemCode: {
                  workOrderCode: li.workOrderCode,
                  projectItemCode: li.projectItemCode,
                },
              },
              data: { isDelivered: false },
            })
          })
        )

        await Promise.all(
          lineItemsToProcess.map((li) => {
            const pItem = li.projectItem
            const qty = safeParseInt(li.qty)

            return tx.projectItem.update({
              where: { code: pItem.code },
              data: {
                stockOut: { decrement: qty },
                totalStock: { increment: qty },
              },
            })
          })
        )
      }
    }
  } catch (error) {
    console.error(error)

    return {
      error: true,
      status: 500,
      message: error instanceof Error ? error.message : 'Something went wrong!',
      action: 'CREDIT_STOCK',
    }
  }
}

export const upsertWorkOrder = action
  .use(authenticationMiddleware)
  .schema(workOrderFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, lineItems, ...data } = parsedInput
    const { userId } = ctx

    const woItems = lineItems.map(({ maxQty, ...li }) => li)

    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      if (code !== -1) {
        const existingWorkOrder = await db.workOrder.findUnique({
          where: { code },
          include,
        })

        if (!existingWorkOrder) {
          return { error: true, status: 404, message: 'Work order not found!', action: 'UPSERT_WORK_ORDER' }
        }

        const [updatedWorkOrder] = await db.$transaction([
          //* update work order
          db.workOrder.update({
            where: { code },
            data: { ...data, updatedBy: userId },
            include: { projectIndividual: { select: { name: true } } },
          }),

          //* delete the existing work order items
          db.workOrderItem.deleteMany({ where: { workOrderCode: code } }),

          //* create new work order items
          db.workOrderItem.createMany({ data: woItems.map((li) => ({ ...li, workOrderCode: code })) }),
        ])

        // const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
        // const owner = existingWorkOrder.userCode

        // //* create notifications
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
        //   title: 'Work Order Updated',
        //   message: `A work order (#${updatedWorkOrder.code}) for ${updatedWorkOrder.projectIndividual.name} was updated by ${ctx.fullName}.`,
        //   link: `/work-orders/${updatedWorkOrder.code}/view`,
        //   entityType: 'WorkOrder' as Prisma.ModelName,
        //   entityCode: updatedWorkOrder.code,
        //   entityId: updatedWorkOrder.id,
        //   userCodes: [owner, ...assignedPics],
        // })

        return {
          status: 200,
          message: 'Work order updated successfully!',
          action: 'UPSERT_WORK_ORDER',
          data: { workOrder: updatedWorkOrder },
        }
      }

      const newWorkOrder = await db.workOrder.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          workOrderItems: { createMany: { data: woItems } },
        },
        include,
      })

      // const assignedPics = newWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      // const owner = newWorkOrder.userCode

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Created',
      //   message: `A new work order (#${newWorkOrder.code}) for ${newWorkOrder.projectIndividual.name} was created by ${ctx.fullName}.`,
      //   link: `/work-orders/${newWorkOrder.code}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: newWorkOrder.code,
      //   entityId: newWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return {
        status: 200,
        message: 'Work order created successfully!',
        action: 'UPSERT_WORK_ORDER',
        data: { workOrder: newWorkOrder },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_WORK_ORDER',
      }
    }
  })

export const deleteWorkOrder = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      const existingWorkOrder = await db.workOrder.findUnique({ where: { code: data.code }, include })

      if (!existingWorkOrder) return { error: true, status: 404, message: 'Work order not found!', action: 'DELETE_WORK_ORDER' }

      // const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      // const owner = existingWorkOrder.userCode

      await db.$transaction(async (tx) => {
        const updatedWorkOrder = await db.workOrder.update({
          where: { code: data.code },
          data: { status: String(WORK_ORDER_STATUS_VALUE_MAP.Deleted), deletedAt: new Date(), deletedBy: ctx.userId },
        })

        //* rollback - because work order status also updated to deleted
        await creditStock({
          tx,
          workOrderCode: updatedWorkOrder.code,
          prevStatus: existingWorkOrder.status,
          currStatus: updatedWorkOrder.status,
          deliveredProjectItems: [],
        })
      })

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Deleted',
      //   message: `A work order (#${data.code}) for ${existingWorkOrder.projectIndividual.name} was deleted by ${ctx.fullName}.`,
      //   link: `/work-orders/${data.code}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: existingWorkOrder.code,
      //   entityId: existingWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return { status: 200, message: 'Work order deleted successfully!', action: 'DELETE_WORK_ORDER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_WORK_ORDER',
      }
    }
  })

export const restoreWorkOrder = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ parsedInput: data }) => {
    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      const existingWorkOrder = await db.workOrder.findUnique({ where: { code: data.code }, include })

      if (!existingWorkOrder) return { error: true, status: 404, message: 'Work order not found!', action: 'RESTORE_WORK_ORDER' }

      // const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      // const owner = existingWorkOrder.userCode

      await db.workOrder.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Restored',
      //   message: `A work order (#${data.code}) for ${existingWorkOrder.projectIndividual.name} was deleted by ${ctx.fullName}.`,
      //   link: `/work-orders/${data.code}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: existingWorkOrder.code,
      //   entityId: existingWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return { status: 200, message: 'Work order retored successfully!', action: 'RESTORE_WORK_ORDER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_WORK_ORDER',
      }
    }
  })

// * upsert only one line item
export const upsertWorkOrderLineItem = action
  .use(authenticationMiddleware)
  .schema(upsertWorkOrderLineItemFormSchema)
  .action(async ({ parsedInput }) => {
    const { workOrderCode, projectItemCode, operation, maxQty, ...data } = parsedInput

    console.log('zzzzz')

    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      const existingWorkOrder = await db.workOrder.findUnique({
        where: { code: workOrderCode },
        include,
      })

      if (!existingWorkOrder) {
        return { error: true, status: 404, message: 'Work order not found!', action: 'UPSERT_WORK_ORDER_LINE_ITEM' }
      }

      // const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      // const owner = existingWorkOrder.userCode

      //* update work order line item
      if (operation === 'update') {
        const updatedWorkOrderItem = await db.workOrderItem.update({
          where: { workOrderCode_projectItemCode: { workOrderCode, projectItemCode } },
          data,
        })

        // //* create notifications
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
        //   title: 'Work Order Line Item Updated',
        //   message: `A work order line item (#${updatedWorkOrderItem.projectItemCode}) for work order (#${existingWorkOrder.code}) was updated by ${ctx.fullName}.`,
        //   link: `/work-orders/${updatedWorkOrderItem.workOrderCode}/view`,
        //   entityType: 'WorkOrder' as Prisma.ModelName,
        //   entityCode: existingWorkOrder.code,
        //   entityId: existingWorkOrder.id,
        //   userCodes: [owner, ...assignedPics],
        // })

        return {
          status: 200,
          message: 'Work order line item updated successfully!',
          action: 'UPSERT_WORK_ORDER_LINE_ITEM',
          data: { workOrderItem: updatedWorkOrderItem },
        }
      }

      //* create work order line item
      const newWorkOrderItem = await db.workOrderItem.create({
        data: { ...data, workOrderCode, projectItemCode },
      })

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Line Item Created',
      //   message: `A new work order line item (#${newWorkOrderItem.projectItemCode}) for work order (#${existingWorkOrder.code}) was created by ${ctx.fullName}.`,
      //   link: `/work-orders/${newWorkOrderItem.workOrderCode}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: existingWorkOrder.code,
      //   entityId: existingWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return {
        status: 200,
        message: 'Work order line item created successfully!',
        action: 'UPSERT_WORK_ORDER_LINE_ITEM',
        data: { workOrderItem: newWorkOrderItem },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_WORK_ORDER_LINE_ITEM',
      }
    }
  })

// * upsert multiple line items
export const upsertWorkOrderLineItems = action
  .use(authenticationMiddleware)
  .schema(upsertWorkOrderLineItemsFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { lineItems, workOrderCode } = parsedInput

    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      const existingWorkOrder = await db.workOrder.findUnique({
        where: { code: workOrderCode },
        include,
      })

      if (!existingWorkOrder) {
        return { error: true, status: 404, message: 'Work order not found!', action: 'UPSERT_WORK_ORDER_LINE_ITEMS' }
      }

      const currLineItems = await db.workOrderItem.findMany({
        where: { workOrderCode },
      })

      const uniqueLineItemsPItemCodes = new Set(lineItems.map((li) => li.projectItemCode))

      const toUpdateLineItems = currLineItems.filter((cli) => uniqueLineItemsPItemCodes.has(cli.projectItemCode))
      const toDeleteLineItems = currLineItems.filter((cli) => !uniqueLineItemsPItemCodes.has(cli.projectItemCode))
      const toDeleteLineItemsPItemCodes = toDeleteLineItems.map((cli) => cli.projectItemCode)

      const newWorkOrderItem = await db.$transaction(async (tx) => {
        //* delete line items
        await tx.workOrderItem.deleteMany({
          where: {
            workOrderCode,
            projectItemCode: { in: toDeleteLineItemsPItemCodes },
          },
        })

        //* upsert line items
        return await Promise.all(
          lineItems.map(({ maxQty, ...li }) => {
            const lineItem = { ...li, workOrderCode }

            return tx.workOrderItem.upsert({
              where: { workOrderCode_projectItemCode: { workOrderCode, projectItemCode: li.projectItemCode } },
              create: lineItem,
              update: lineItem,
            })
          })
        )
      })

      const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      const owner = existingWorkOrder.userCode

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Line Items Updated',
      //   message: `${toUpdateLineItems.length} ${toUpdateLineItems.length > 1 ? 'items were' : 'item was'} updated and ${toDeleteLineItems.length} ${toDeleteLineItems.length > 1 ? 'items were' : 'item was'} deleted by ${ctx.fullName}.`,
      //   link: `/work-orders/${existingWorkOrder.code}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: existingWorkOrder.code,
      //   entityId: existingWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return {
        status: 200,
        message: 'Work order lines item updated successfully!',
        action: 'UPSERT_WORK_ORDER_LINE_ITEMS',
        data: { workOrderItem: newWorkOrderItem },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_WORK_ORDER_LINE_ITEMS',
      }
    }
  })

export const deleteWorkOrderLineItem = action
  .use(authenticationMiddleware)
  .schema(deleteWorkOrderLineItemFormSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    try {
      const existingWorkOrder = await db.workOrder.findUnique({
        where: { code: data.workOrderCode },
        include,
      })

      if (!existingWorkOrder) {
        return { error: true, status: 404, message: 'Work order not found!', action: 'DELETE_WORK_ORDER_LINE_ITEM' }
      }

      // const assignedPics = existingWorkOrder.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      // const owner = existingWorkOrder.userCode

      const workOrderLineItem = await db.workOrderItem.findUnique({
        where: { workOrderCode_projectItemCode: { workOrderCode: data.workOrderCode, projectItemCode: data.projectItemCode } },
      })

      if (!workOrderLineItem) {
        return { error: true, status: 404, message: 'Work order line item not found!', action: 'DELETE_WORK_ORDER_LINE_ITEM' }
      }

      await db.workOrderItem.delete({
        where: { workOrderCode_projectItemCode: { workOrderCode: data.workOrderCode, projectItemCode: data.projectItemCode } },
      })

      // //* create notifications
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //   title: 'Work Order Line Item Deleted',
      //   message: `A work order line item (#${workOrderLineItem.projectItemCode}) for work order (#${existingWorkOrder.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/work-orders/${data.workOrderCode}/view`,
      //   entityType: 'WorkOrder' as Prisma.ModelName,
      //   entityCode: existingWorkOrder.code,
      //   entityId: existingWorkOrder.id,
      //   userCodes: [owner, ...assignedPics],
      // })

      return { status: 200, message: 'Work order deleted successfully!', action: 'DELETE_WORK_ORDER_LINE_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_WORK_ORDER_LINE_ITEM',
      }
    }
  })

export const updateWorkeOrderStatus = action
  .use(authenticationMiddleware)
  .schema(workOrderStatusUpdateFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workOrders, currentStatus, comments, trackingNum } = parsedInput
    const { userId } = ctx

    const include = {
      projectIndividual: {
        include: {
          projectIndividualCustomers: {
            //* only return the customer that has role 'admin' which they allowed to 'receive notifications (owner)' permission action
            where: {
              user: {
                OR: [
                  {
                    role: {
                      rolePermissions: {
                        some: {
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
                          permission: { code: PERMISSIONS_CODES['WORK ORDERS'] },
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
        },
      },
    } satisfies Prisma.WorkOrderInclude

    const workOrderCodes = workOrders.map((wo) => wo.code)

    try {
      const existingWorkOrders = await db.workOrder.findMany({ where: { code: { in: workOrderCodes } } })

      //* make sure all work orders to update exist otherwise return error
      if (existingWorkOrders.length > 0 && workOrderCodes.length > 0 && existingWorkOrders.length !== workOrderCodes.length) {
        return { error: true, status: 422, message: 'Failed to process request!', action: 'UPDATE_WORK_ORDER_STATUS' }
      }

      //* get work orders that have changed status, and the next (current status) should be greater than the previous status, not allowed to go back to the previous status
      //* add if '5' still allow to update status to '5' - means partial delivery
      const changedWorkOrders = workOrders
        .filter((wo) => currentStatus == '5' || wo.prevStatus !== currentStatus)
        .filter((wo) => currentStatus == '5' || currentStatus > wo.prevStatus)

      const updatedWorkOrders = await db.$transaction(async (tx) => {
        //* update work orders then create work order status updates
        const result = await Promise.all(
          changedWorkOrders
            .map((wo) => {
              return tx.workOrder.update({
                where: { code: wo.code },
                data: {
                  status: currentStatus,
                  updatedBy: userId,
                  workOrderStatusUpdates: {
                    create: {
                      prevStatus: wo.prevStatus,
                      currentStatus,
                      comments,
                      createdBy: userId,
                      trackingNum,
                    },
                  },
                },
                include,
              })
            })
            .filter((update) => update !== null)
        )

        //* credit stock`
        await Promise.all(
          changedWorkOrders.map((wo) =>
            creditStock({
              tx,
              workOrderCode: wo.code,
              prevStatus: wo.prevStatus,
              currStatus: currentStatus,
              deliveredProjectItems: wo.deliveredProjectItems,
            })
          )
        )

        return result
      })

      // //* create notifications
      // if (updatedWorkOrders.length > 0) {
      //   updatedWorkOrders.forEach((wo) => {
      //     const assignedPics = wo.projectIndividual.projectIndividualPics.map((pip) => pip.userCode)
      //     const owner = wo.userCode
      //     const status = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || ''

      //     void createNotification(ctx, {
      //       permissionCode: PERMISSIONS_CODES['WORK ORDERS'],
      //       title: 'Work Order Status Updated',
      //       message: `A work order's (#${wo.code}) status was updated to '${status}' by ${ctx.fullName}.`,
      //       link: `/work-orders/${wo.code}/view`,
      //       entityType: 'WorkOrder' as Prisma.ModelName,
      //       entityCode: wo.code,
      //       entityId: wo.id,
      //       userCodes: [owner, ...assignedPics],
      //     })
      //   })
      // }

      return {
        status: 200,
        message: 'Work order status updated successfully!',
        action: 'UPDATE_WORK_ORDER_STATUS',
        data: { workOrders: updatedWorkOrders, appliedStatus: currentStatus },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_WORK_ORDER_STATUS',
      }
    }
  })
