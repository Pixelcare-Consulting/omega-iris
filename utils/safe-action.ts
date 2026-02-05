import { auth } from '@/auth'
import { createMiddleware, createSafeActionClient } from 'next-safe-action'
import { db } from './db'
import { buildAbilityFor } from './acl'

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
    },
  })
})

//TODO: add authorization middle based on roles and permissions

export const action = createSafeActionClient({ handleServerError })
