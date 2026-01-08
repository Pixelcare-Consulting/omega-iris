'use server'

import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { roleFormSchema } from '@/schema/role'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

const COMMON_ROLE_ORDER_BY = { code: 'asc' } satisfies Prisma.RoleOrderByWithRelationInput

export async function getRoles() {
  try {
    return db.role.findMany({
      orderBy: COMMON_ROLE_ORDER_BY,
    })
  } catch (error) {
    return []
  }
}

export async function getRolesByCode(code: number) {
  if (!code) return null

  try {
    return db.role.findUnique({ where: { code } })
  } catch (err) {
    return null
  }
}

export const getRolesClient = action.use(authenticationMiddleware).action(async () => {
  return getRoles()
})

export const upsertRole = action
  .use(authenticationMiddleware)
  .schema(roleFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, permissions, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingRole = await db.role.findFirst({ where: { key: data.key, ...(code && code !== -1 && { code: { not: code } }) } })

      //* check if existing
      if (existingRole) return { error: true, status: 401, message: 'Role key already exists!', action: 'UPSERT_ROLE' }

      //*  update role
      if (code && code !== -1) {
        const updatedRole = await db.$transaction(async (tx) => {
          //* update role
          const role = await tx.role.update({ where: { code }, data: { ...data, updatedBy: userId } })

          //* delete the existing role permissions records
          await tx.rolePermission.deleteMany({ where: { roleId: role.id } })

          //* create new role permissions
          await tx.rolePermission.createMany({
            data: permissions.filter((p) => p.actions.length > 0).map((p) => ({ roleId: role.id, permissionId: p.id, actions: p.actions })),
          })

          return role
        })

        return {
          status: 200,
          message: 'Role updated successfully!',
          action: 'UPSERT_ROLE',
          data: { role: updatedRole },
        }
      }

      //* create role
      const newRole = await db.role.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
          rolePermissions: {
            createMany: {
              data: permissions.filter((p) => p.actions.length > 0).map((p) => ({ permissionId: p.id, actions: p.actions })),
            },
          },
        },
      })

      return { status: 200, message: 'Role created successfully!', action: 'UPSERT_ROLE', data: { role: newRole } }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_ROLE',
      }
    }
  })

export const deleleteRole = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const role = await db.role.findUnique({ where: { code: data.code } })

      if (!role) return { error: true, status: 404, message: 'Role not found!', action: 'DELETE_ROLE' }

      await db.role.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Role deleted successfully!', action: 'DELETE_ROLE' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_ROLE',
      }
    }
  })

export const restoreRole = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ parsedInput: data }) => {
    try {
      const role = await db.role.findUnique({ where: { code: data.code } })

      if (!role) return { error: true, status: 404, message: 'Role not found!', action: 'RESTORE_ROLE' }

      await db.role.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      return { status: 200, message: 'Role retored successfully!', action: 'RESTORE_ROLE' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_ROLE',
      }
    }
  })
