'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import {
  deleteWorkOrderLineItemFormSchema,
  upsertWorkOrderLineItemFormSchema,
  workOrderFormSchema,
  workOrderStatusUpdateFormSchema,
} from '@/schema/work-order'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { safeParseInt } from '@/utils'
import { getCurrentUserAbility } from './auth'

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

    //TODO: if work order create qty credited to stock-in and qty will be locked

    //* only credit stocks-in only when new status is 'Open' or 'Pending' and old status === 0,
    //*  means after work order is created by admin - default to 'Open' or by customer - default to 'Pending'
    if (oldStatus === 0 && (newStatus === 1 || newStatus === 2)) {
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
    if (oldStatus !== 0 && oldStatus >= 1 && oldStatus <= 4 && newStatus >= 1 && newStatus <= 4) return

    //* if old status is 'Verified' and current status is 'Partial Delivery,
    //* then credit qty of the items that has beed mark as delivered to stock-in and debit total stock accordingly
    //* once item is already marked as delivered, will not be included
    if ((oldStatus === 4 || oldStatus === 5) && newStatus === 5) {
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

    //* if old status is 'Verified' and new status is = 'Delivered'
    //* then credit qty of the items that isDelivered = false to stock-in and debit stock-in & total stock accordingly
    //* once item is already marked as delivered, will not be included
    if ((oldStatus === 4 || oldStatus === 5) && newStatus === 6) {
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
    if (newStatus === 7 || newStatus === 8) {
      //* if between or equal to 'Open' and 'Verified' and then cancel or delete, then rollback stock
      if (oldStatus >= 1 && oldStatus <= 4) {
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
      if (oldStatus >= 5 && oldStatus <= 6) {
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

    try {
      if (code !== -1) {
        const [updatedWorkOrder] = await db.$transaction([
          //* update work order
          db.workOrder.update({ where: { code }, data: { ...data, updatedBy: userId } }),

          //* delete the existing work order items
          db.workOrderItem.deleteMany({ where: { workOrderCode: code } }),

          //* create new work order items
          db.workOrderItem.createMany({ data: woItems.map((li) => ({ ...li, workOrderCode: code })) }),
        ])

        return {
          status: 200,
          message: 'Work order updated successfully!',
          action: 'UPSERT_WORK_ORDER',
          data: { workOrder: updatedWorkOrder },
        }
      }

      const newWorkOrder = await db.$transaction(async (tx) => {
        //* create new work order
        const wo = await db.workOrder.create({
          data: {
            ...data,
            createdBy: userId,
            updatedBy: userId,
            workOrderItems: { createMany: { data: woItems } },
          },
        })

        //* credit stock-in upon successful creation of work order
        //* it should be status = 'Open' or 'Pending' for it to be credited
        await creditStock({
          tx,
          workOrderCode: wo.code,
          prevStatus: null,
          currStatus: wo.status,
          deliveredProjectItems: [],
        })

        return wo
      })

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

export const upsertWorkOrderLineItem = action
  .use(authenticationMiddleware)
  .schema(upsertWorkOrderLineItemFormSchema)
  .action(async ({ parsedInput }) => {
    const { workOrderCode, projectItemCode, operation, maxQty, ...data } = parsedInput

    try {
      //* update work order line item
      if (operation === 'update') {
        const updatedWorkOrderItem = await db.workOrderItem.update({
          where: { workOrderCode_projectItemCode: { workOrderCode, projectItemCode } },
          data,
        })

        return {
          status: 200,
          message: 'Work order line item updated successfully!',
          action: 'UPDATE_WORK_ORDER_LINE_ITEM',
          data: { workOrderItem: updatedWorkOrderItem },
        }
      }

      //* create work order line item
      const newWorkOrderItem = await db.workOrderItem.create({
        data: { ...data, workOrderCode, projectItemCode },
      })

      return {
        status: 200,
        message: 'Work order line item created successfully!',
        action: 'UPDATE_WORK_ORDER_LINE_ITEM',
        data: { workOrderItem: newWorkOrderItem },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_WORK_ORDER_LINE_ITEM',
      }
    }
  })

export const deleteWorkOrderLineItem = action.schema(deleteWorkOrderLineItemFormSchema).action(async ({ parsedInput: data }) => {
  try {
    const workOrderLineItem = await db.workOrderItem.findUnique({
      where: { workOrderCode_projectItemCode: { workOrderCode: data.workOrderCode, projectItemCode: data.projectItemCode } },
    })

    if (!workOrderLineItem) {
      return { error: true, status: 404, message: 'Work order line item not found!', action: 'DELETE_WORK_ORDER_LINE_ITEM' }
    }

    await db.workOrderItem.delete({
      where: { workOrderCode_projectItemCode: { workOrderCode: data.workOrderCode, projectItemCode: data.projectItemCode } },
    })

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

export const deleteWorkOrder = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const workOrder = await db.workOrder.findUnique({ where: { code: data.code } })

      if (!workOrder) return { error: true, status: 404, message: 'Work order not found!', action: 'DELETE_WORK_ORDER' }

      await db.workOrder.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

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
    try {
      const workOrder = await db.workOrder.findUnique({ where: { code: data.code } })

      if (!workOrder) {
        return { error: true, status: 404, message: 'Work order not found!', action: 'RESTORE_WORK_ORDER' }
      }

      await db.workOrder.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

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
