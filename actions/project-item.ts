'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { projectItemFormSchema } from '@/schema/project-item'
import { paramsSchema } from '@/schema/common'

const COMMON_PROJECT_ITEM_INCLUDE = {
  item: true,
  projectIndividual: true,
} satisfies Prisma.ProjectItemInclude

const COMMON_PROJECT_ITEM_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectItemOrderByWithRelationInput

export async function getProjecItems(projectCode: number) {
  if (!projectCode) return []

  try {
    return await db.projectItem.findMany({
      where: { deletedAt: null, deletedBy: null, projectIndividualCode: projectCode },
      include: COMMON_PROJECT_ITEM_INCLUDE,
      orderBy: COMMON_PROJECT_ITEM_ORDER_BY,
    })
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
      const existingProjectItem = await db.projectItem.findFirst({
        where: {
          projectIndividualCode: data.projectIndividualCode,
          itemCode: data.itemCode,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingProjectItem) return { error: true, status: 401, message: 'Project item already exists!', action: 'UPSERT_PROJECT_ITEM' }

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

      if (!projectItem) return { error: true, status: 404, message: 'Project item not found', action: 'DELETE_PROJECT_ITEM' }

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
