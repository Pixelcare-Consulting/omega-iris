'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'
import { MODULE_NAME, ModuleName } from '@/constants/module'
import { SUPER_USER_ROLE_KEY } from '@/constants/role'

//* admins have no hidden fields, a missing row means nothing is hidden
export async function getUserHiddenFields(userCode: number | null | undefined, roleKey: string | null | undefined, moduleName: ModuleName) {
  if (!userCode || roleKey === SUPER_USER_ROLE_KEY) return []

  try {
    const row = await db.userHiddenField.findUnique({ where: { userCode_moduleName: { userCode, moduleName } }, select: { fields: true } })
    return row?.fields ?? []
  } catch (error) {
    console.error(error)
    return []
  }
}

//* hidden fields of the signed in user, grids and views use it to drop their columns
export const getCurrentUserHiddenFieldsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ moduleName: z.nativeEnum(MODULE_NAME) }))
  .action(async ({ ctx, parsedInput }) => {
    return getUserHiddenFields(ctx.userCode, ctx.roleKey, parsedInput.moduleName)
  })
