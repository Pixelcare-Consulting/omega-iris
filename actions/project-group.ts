'use server'

import { paramsSchema } from '@/schema/common'
import { projectGroupFormSchema } from '@/schema/project-group'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getProjectGroups() {
  try {
    return await db.projectGroup.findMany({
      where: { deletedAt: null, deletedBy: null },
    })
  } catch (error) {
    return []
  }
}

export const getProjectGroupsClient = action.use(authenticationMiddleware).action(async () => {
  return getProjectGroups()
})

export async function getProjectGroupByCode(code: number) {
  if (!code) return null

  try {
    return await db.projectGroup.findUnique({ where: { code } })
  } catch (err) {
    return null
  }
}

export const upsertProjectGroup = action
  .use(authenticationMiddleware)
  .schema(projectGroupFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update project group
      if (code !== -1) {
        const updatedProjectGroup = await db.projectGroup.update({ where: { code }, data: { ...data, updatedBy: userId } })

        return {
          status: 200,
          message: 'Project group updated successfully!',
          action: 'UPSERT_PROJECT_GROUP',
          data: { projectGroup: updatedProjectGroup },
        }
      }

      //* create project group
      const newProjectGroup = await db.projectGroup.create({ data: { ...data, createdBy: userId, updatedBy: userId } })

      return {
        status: 200,
        message: 'Project group created successfully!',
        action: 'UPSERT_PROJECT_GROUP',
        data: { projectGroup: newProjectGroup },
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

export const deleleteProjectGroup = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectGroup = await db.projectGroup.findUnique({ where: { code: data.code } })

      if (!projectGroup) return { error: true, code: 404, message: 'Project group not found', action: 'DELETE_PROJECT_GROUP' }

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
