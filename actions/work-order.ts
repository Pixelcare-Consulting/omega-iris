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

const COMMON_WORK_ORDER_ORDER_BY = { code: 'asc' } satisfies Prisma.WorkOrderOrderByWithRelationInput

export async function getWorkOrders() {
  try {
    return await db.workOrder.findMany({
      where: { deletedAt: null, deletedBy: null },
      include: COMMON_WORK_ORDER_INCLUDE,
      orderBy: COMMON_WORK_ORDER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getWorkOrderByCode(code: number) {
  if (!code) return null

  try {
    return await db.workOrder.findUnique({ where: { code }, include: COMMON_WORK_ORDER_INCLUDE })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertWorkOrder = action
  .use(authenticationMiddleware)
  .schema(workOrderFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, lineItems, ...data } = parsedInput
    const { userId } = ctx

    const woItems = lineItems.map((li) => ({ ...li, workOrderCode: code }))

    try {
      if (code !== -1) {
        const [updatedWorkOrder] = await db.$transaction([
          //* update work order
          db.workOrder.update({ where: { code }, data: { ...data, updatedBy: userId } }),

          //* delete the existing work order items
          db.workOrderItem.deleteMany({ where: { workOrderCode: code } }),

          //* create new work order items
          db.workOrderItem.createMany({ data: woItems }),
        ])

        return {
          status: 200,
          message: 'Work order updated successfully!',
          action: 'UPSERT_WORK_ORDER',
          data: { workOrder: updatedWorkOrder },
        }
      }

      //* create new work order
      const newWorkOrder = await db.workOrder.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          workOrderItems: { createMany: { data: woItems } },
        },
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
    const { workOrderCode, projectItemCode, operation, ...data } = parsedInput

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
    console.log({
      workOrderCode: data.workOrderCode,
      projectItemCode: data.projectItemCode,
    })

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
    const { workOrders, currentStatus, comments } = parsedInput
    const { userId } = ctx

    const workOrderCodes = workOrders.map((wo) => wo.code)

    try {
      const existingWorkOrders = await db.workOrder.findMany({ where: { code: { in: workOrderCodes } } })

      //* make sure all work orders to update exist otherwise return error
      if (existingWorkOrders.length > 0 && workOrderCodes.length > 0 && existingWorkOrders.length !== workOrderCodes.length) {
        return { error: true, status: 422, message: 'Failed to process request!', action: 'UPDATE_WORK_ORDER_STATUS' }
      }

      const updatedWorkOrders = await db.$transaction(async (tx) => {
        //* update work orders then create work order status updates
        const result = await Promise.all(
          workOrders
            .map((wo) => {
              //*  return null if prevStatus is same as currentStatus
              if (wo.prevStatus === currentStatus) return null

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
                    },
                  },
                },
              })
            })
            .filter((update) => update !== null)
        )

        return result
      })

      return {
        status: 200,
        message: 'Work order status updated successfully!',
        action: 'UPDATE_WORK_ORDER_STATUS',
        data: { workOrders: updatedWorkOrders },
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
