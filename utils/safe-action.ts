import { auth } from '@/auth'
import { createMiddleware, createSafeActionClient } from 'next-safe-action'
import { db } from './db'
import { buildAbilityFor } from './acl'
import { isSapDatabaseAllowedForRole } from './sap-database-access'

function handleServerError(error: Error) {
  console.error(error)
  throw error
}

//? ISSUE - ReferenceError: Cannot access 'action' before initialization
//? DESCRIPTION - The issue occured cause by circular dependency - e.g when importing something from other source which also uses action e.g /action/users.ts
//* SOLUTION - Don't import something from other file which uses action or something inside safe-action.ts

export const authenticationMiddleware = createMiddleware().define(async ({ next }) => {
  const session = await auth()

  if (!session || !session.user) throw { code: 401, message: 'Unauthorized!', action: 'AUTHENTICATION_MIDDLEWARE' }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })

  if (!user) throw { code: 401, message: 'Unauthorized!', action: 'AUTHENTICATION_MIDDLEWARE' }

  const { id, code, role } = user

  const rolePermissions = role.rolePermissions.map((rp) => ({
    id: rp.permissionId,
    code: rp.permission.code,
    actions: rp.actions,
  }))

  const fullName = [user.fname, user.lname].filter(Boolean).join(' ')

  const ability = buildAbilityFor({ roleKey: role.key, rolePermissions })

  return next({
    ctx: {
      fullName,
      userId: id,
      userCode: code,
      roleCode: role.code,
      roleKey: role.key,
      roleName: role.name,
      ability,
      dbCode: session.user.sapDbCode ?? null, //* null for global actions, tenantMiddleware narrows it to a string for tenant scoped ones
    },
  })
})

//* chain after authenticationMiddleware on any action that touches tenant data, ctx.dbCode is a string after this
export const tenantMiddleware = createMiddleware<{ ctx: { dbCode: string | null; roleCode: number } }>().define(
  async ({ next, ctx }) => {
    if (!ctx.dbCode) throw { code: 401, message: 'No SAP database selected!', action: 'TENANT_MIDDLEWARE' }

    //* the session keeps the database it was given, so access removed after signin is only caught here
    const isAllowed = await isSapDatabaseAllowedForRole(ctx.dbCode, ctx.roleCode)

    if (!isAllowed) throw { code: 403, message: 'No access to this SAP database!', action: 'TENANT_MIDDLEWARE' }

    return next({ ctx: { dbCode: ctx.dbCode } })
  }
)

//TODO: add authorization middle based on roles and permissions

export const action = createSafeActionClient({ handleServerError })
