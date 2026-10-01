'use server'

import bcrypt from 'bcryptjs'
import { capitalize } from 'radash'
import { Prisma } from '@prisma/client'
import z from 'zod'

import { paramsSchema } from '@/schema/common'
import { basicInfoFormSchema, changePasswordFormSchema, userFormSchema } from '@/schema/user'
import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'
import { DuplicateFields } from '@/types/common'
import { createNotification } from './notification'
import { PERMISSIONS_CODES } from '@/constants/permission'
import { BUSINESS_PARTNER_ROLE_KEY, SUPER_USER_ROLE_KEY } from '@/constants/role'
import { HIDDEN_FIELD_MODULES } from '@/constants/hidden-field'
import { BP_PROFILE_TYPE, BP_PROFILE_SELECT, pickBpProfile } from '@/utils/user-bp-profile'
import { findBpProfileRowError, saveBpProfileRows } from '@/utils/user-bp-profile-db'

//* every company's cards, for the admin user pages
const COMMON_USER_INCLUDE = {
  role: true,
  profile: true,
  bpProfiles: { select: BP_PROFILE_SELECT, orderBy: { dbCode: 'asc' } },
} satisfies Prisma.UserInclude

//* only this company's cards, for anything the browser calls — no company selected returns none
function companyUserInclude(dbCode: string | null) {
  return {
    ...COMMON_USER_INCLUDE,
    bpProfiles: { ...COMMON_USER_INCLUDE.bpProfiles, where: { dbCode: dbCode ?? '' } },
  } satisfies Prisma.UserInclude
}

const NON_CUSTOMER_USER_WHERE = {
  role: { key: { not: BUSINESS_PARTNER_ROLE_KEY } },
  deletedAt: null,
  deletedBy: null,
} satisfies Prisma.UserWhereInput

const COMMON_USER_ORDER_BY ={ code: 'asc' } satisfies Prisma.UserOrderByWithRelationInput

//* one row per user and module, upsert so saving twice never duplicates it
//* admins see every field, so every module is saved empty for them
async function upsertUserHiddenFields(
  tx: Prisma.TransactionClient,
  userCode: number,
  roleKey: string,
  hiddenFields: Record<string, string[] | null | undefined>,
  userId: string
) {
  const isAdmin = roleKey === SUPER_USER_ROLE_KEY

  return Promise.all(
    HIDDEN_FIELD_MODULES.map(({ moduleName, columns }) => {
      //* drop keys that are not columns of the module
      const fields = isAdmin ? [] : (hiddenFields[moduleName] ?? []).filter((field) => field in columns)

      return tx.userHiddenField.upsert({
        where: { userCode_moduleName: { userCode, moduleName } },
        create: { userCode, moduleName, fields, createdBy: userId, updatedBy: userId },
        update: { fields, updatedBy: userId },
      })
    })
  )
}

export async function getUsers() {
  try {
    return db.user.findMany({
      include: COMMON_USER_INCLUDE,
      orderBy: COMMON_USER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getUsersClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return db.user.findMany({ include: companyUserInclude(ctx.dbCode), orderBy: COMMON_USER_ORDER_BY })
})

export async function getNonCustomerUsers() {
  try {
    return db.user.findMany({
      where: NON_CUSTOMER_USER_WHERE,
      include: COMMON_USER_INCLUDE,
      orderBy: COMMON_USER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getNonCustomerUsersClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return db.user.findMany({ where: NON_CUSTOMER_USER_WHERE, include: companyUserInclude(ctx.dbCode), orderBy: COMMON_USER_ORDER_BY })
})

export async function getUserByEmail(email: string) {
  if (!email) return null

  try {
    return db.user.findUnique({ where: { email }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export async function getUserByUsername(username: string) {
  if (!username) return null

  try {
    return db.user.findUnique({ where: { username }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export async function getUserById(id: string) {
  if (!id) return null

  try {
    return db.user.findUnique({ where: { id }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export const getUserByIdClient = action
  .schema(z.object({ id: z.string().nullish() }))
  .use(authenticationMiddleware)
  .action(async ({ ctx, parsedInput: data }) => {
    if (!data.id) return null
    return db.user.findUnique({ where: { id: data.id }, include: companyUserInclude(ctx.dbCode) })
  })

export async function getUserByCode(code: number) {
  if (!code) return null

  try {
    return db.user.findUnique({
      where: { code },
      include: { ...COMMON_USER_INCLUDE, hiddenFields: { select: { moduleName: true, fields: true } } },
    })
  } catch (err) {
    return null
  }
}

export const getUserByCodeClient = action
  .schema(z.object({ code: z.coerce.number().nullish() }))
  .use(authenticationMiddleware)
  .action(async ({ ctx, parsedInput: data }) => {
    if (!data.code) return null
    return db.user.findUnique({
      where: { code: data.code },
      include: { ...companyUserInclude(ctx.dbCode), hiddenFields: { select: { moduleName: true, fields: true } } },
    })
  })

export async function getUsersByRoleKey(dbCode: string, key: string) {
  if (!key) return []

  try {
    const users = await db.user.findMany({
      where: {
        role: { key },
        //! only bp users with a customer card here, offering one from another company links a project across tenants
        ...(key === BUSINESS_PARTNER_ROLE_KEY ? { bpProfiles: { some: { dbCode, cardType: BP_PROFILE_TYPE.CUSTOMER } } } : {}),
      },
      include: COMMON_USER_INCLUDE,
      orderBy: COMMON_USER_ORDER_BY,
    })

    //* this company's customer code, the pickers and grids read it by name
    return users.map((user) => ({ ...user, customerCode: pickBpProfile(user.bpProfiles, dbCode, BP_PROFILE_TYPE.CUSTOMER)?.cardCode ?? null }))
  } catch (err) {
    return []
  }
}

export const getUsersByRoleKeyClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ key: z.string() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getUsersByRoleKey(ctx.dbCode, data.key)
  })

export async function getAccountByUserId(id: string) {
  if (!id) return null

  try {
    return db.account.findFirst({ where: { userId: id } })
  } catch (err) {
    return null
  }
}

export const upsertUser = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(userFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const {
      code,
      password,
      confirmPassword,
      newPassword,
      newConfirmPassword,
      roleKey,
      isForceToChangePassword,
      isLocked,
      hiddenFields,
      bpProfiles,
      ...data
    } = parsedInput
    const { userId } = ctx

    //! the form can set cards in every company, so only user admins may save it
    const canSave = ctx.ability?.can(code === -1 ? 'create' : 'edit', 'p-users')
    if (!canSave) return { error: true, status: 403, message: 'No access to save users!', action: 'UPSERT_USER' }

    try {
      const [existingUsername, existingEmail] = await Promise.all([
        db.user.findFirst({
          where: {
            username: data.username,
            ...(code && code !== -1 && { code: { not: code } }),
          },
        }),
        db.user.findFirst({
          where: {
            email: data.email,
            ...(code && code !== -1 && { code: { not: code } }),
          },
        }),
      ])

      const duplicates: DuplicateFields = []

      if (existingUsername) duplicates.push({ field: 'username', name: 'Username', message: 'Username already exists!' })
      if (existingEmail) duplicates.push({ field: 'email', name: 'Email', message: 'Email already exists!' })

      if (duplicates.length > 0) {
        const paths = duplicates.map((d) => ({ field: d.field, message: d.message }))
        const message = duplicates.map((d) => d.name).join(', ')
        return { error: true, status: 401, message: `${capitalize(message)} already exists!`, action: 'UPSERT_USER', paths }
      }

      //! checked before any write, one bad row rejects the whole save
      const bpProfileError = await findBpProfileRowError(bpProfiles)
      if (bpProfileError) return { error: true, status: 400, message: bpProfileError, action: 'UPSERT_USER' }

      //* update user
      if (code !== -1) {
        const user = await db.user.findUnique({ where: { code } })

        if (!user) return { error: true, status: 404, message: 'User not found!', action: 'UPSERT_USER' }

        let hashedPassword = user.password

        if (newPassword) hashedPassword = await bcrypt.hash(newPassword, 10)

        const isBeingUnlocked = user.isLocked && !isLocked

        const updatedUser = await db.$transaction(async (tx) => {
          const updated = await tx.user.update({
            where: { code },
            data: {
              ...data,
              password: hashedPassword,
              updatedBy: userId,
              isDefaultPasswordChanged: isForceToChangePassword ? false : true,
              isLocked: isLocked ? true : false,
              failedLoginAttempts: isBeingUnlocked ? 0 : user.failedLoginAttempts,
            },
          })

          await upsertUserHiddenFields(tx, updated.code, roleKey, hiddenFields, userId)
          await saveBpProfileRows(tx, updated.code, bpProfiles, userId)

          return updated
        })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.USERS,
        //   title: 'User Updated',
        //   message: `A user (#${updatedUser.code}) was updated by ${ctx.fullName}.`,
        //   link: `/users/${updatedUser.code}/view`,
        //   entityType: 'User' as Prisma.ModelName,
        //   entityCode: updatedUser.code,
        //   entityId: updatedUser.id,
        //   userCodes: [],
        // })

        return { status: 200, message: 'User updated successfully!', data: { user: updatedUser }, action: 'UPSERT_USER' }
      }

      const hashedPassword = await bcrypt.hash(password!, 10)

      //* create user
      const newUser = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            ...data,
            password: hashedPassword,
            createdBy: userId,
            updatedBy: userId,
            profile: { create: { details: {} } },
            isDefaultPasswordChanged: isForceToChangePassword ? false : true,
            isLocked: isLocked ? true : false,
          },
          include: { role: true },
        })

        await upsertUserHiddenFields(tx, created.code, roleKey, hiddenFields, userId)
        await saveBpProfileRows(tx, created.code, bpProfiles, userId)

        return created
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.USERS,
      //   title: 'User Created',
      //   message: `A new user (#${newUser.code}) was created by ${ctx.fullName} and assigned the role ${newUser.role.name}.`,
      //   link: `/users/${newUser.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: newUser.code,
      //   entityId: newUser.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'User created successfully!', data: { user: newUser }, action: 'UPSERT_USER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_USER',
      }
    }
  })

export const updateBasicInfo = action
  .use(authenticationMiddleware)
  .schema(basicInfoFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, roleKey, ...data } = parsedInput
    const { userId } = ctx

    try {
      const [existingUsername, existingEmail] = await Promise.all([
        db.user.findFirst({
          where: {
            username: data.username,
            code: { not: code },
          },
        }),
        db.user.findFirst({
          where: {
            email: data.email,
            code: { not: code },
          },
        }),
      ])

      const duplicates: DuplicateFields = []

      if (existingUsername) duplicates.push({ field: 'username', name: 'Username', message: 'Username already exists!' })
      if (existingEmail) duplicates.push({ field: 'email', name: 'Email', message: 'Email already exists!' })

      if (duplicates.length > 0) {
        const paths = duplicates.map((d) => ({ field: d.field, message: d.message }))
        const message = duplicates.map((d) => d.name).join(', ')
        return { error: true, status: 401, message: `${capitalize(message)} already exists!`, action: 'UPDATE_PROFILE_BASIC_INFO', paths }
      }

      //* update user
      const user = await db.user.findUnique({ where: { code } })

      if (!user) return { error: true, status: 404, message: 'User not found!', action: 'UPDATE_PROFILE_BASIC_INFO' }

      const updatedUser = await db.user.update({
        where: { code },
        data: { ...data, updatedBy: userId },
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.USERS,
      //   title: 'User Basic Info Updated',
      //   message: `A user (#${updatedUser.code}) basic info was updated by ${ctx.fullName}.`,
      //   link: `/users/${updatedUser.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: updatedUser.code,
      //   entityId: updatedUser.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Basic info updated successfully!', data: { user: updatedUser }, action: 'UPDATE_PROFILE_BASIC_INFO' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROFILE_BASIC_INFO',
      }
    }
  })

export const changePassword = action
  .use(authenticationMiddleware)
  .schema(changePasswordFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, oldPassword, newPassword, isForceToChangePassword } = parsedInput
    const { userId } = ctx

    const action = isForceToChangePassword ? 'CHANGED_DEFAULT_PASSWORD' : 'UPDATE_PROFILE_CHANGE_PASSWORD'

    try {
      const user = await db.user.findUnique({ where: { code } })

      if (!user) return { error: true, status: 404, message: 'User not found!', action }

      let hashedPassword = user.password

      //* not forced to chnage password, but will change password
      if (oldPassword && newPassword && !isForceToChangePassword) {
        //* if old password is provided, check if it matches the current password
        if (user.password) {
          const isPasswordMatch = await bcrypt.compare(oldPassword, user.password)
          if (!isPasswordMatch) return { error: true, status: 409, message: 'Old password does not match', action }
        }

        hashedPassword = await bcrypt.hash(newPassword, 10)
      }

      //* force to change password
      if (isForceToChangePassword && newPassword) {
        //* if new password is provided, and isForceToChangePassword = true means user is force to change their password, then hash the new password
        hashedPassword = await bcrypt.hash(newPassword, 10)
      }

      const updatedUser = await db.user.update({
        where: { code },
        data: {
          password: hashedPassword,
          updatedBy: userId,
          ...(isForceToChangePassword && {
            isDefaultPasswordChanged: true,
          }),
        },
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.USERS,
      //   title: 'User Password Changed',
      //   message: `A user (#${updatedUser.code}) password was changed by ${ctx.fullName}.`,
      //   link: `/users/${updatedUser.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: updatedUser.code,
      //   entityId: updatedUser.id,
      //   userCodes: [],
      // })

      return {
        status: 200,
        message: 'Password changed successfully!',
        data: { user: updatedUser },
        action,
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROFILE_CHANGE_PASSWORD',
      }
    }
  })

export const deleteUser = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const user = await db.user.findUnique({ where: { code: data.code } })

      if (!user) return { error: true, status: 404, message: 'User not found!', action: 'DELETE_USER' }

      await db.user.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.USERS,
      //   title: 'User Deleted',
      //   message: `A user (#${user.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/users/${user.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: user.code,
      //   entityId: user.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'User deleted successfully!', action: 'DELETE_USER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_USER',
      }
    }
  })

export const restoreUser = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const user = await db.user.findUnique({ where: { code: data.code } })

      if (!user) return { error: true, status: 404, message: 'User not found!', action: 'RESTORE_USER' }

      await db.user.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.USERS,
      //   title: 'User Restored',
      //   message: `A user (#${user.code}) was restored by ${ctx.fullName}.`,
      //   link: `/users/${user.code}/view`,
      //   entityType: 'User' as Prisma.ModelName,
      //   entityCode: user.code,
      //   entityId: user.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'User retored successfully!', action: 'RESTORE_USER' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_USER',
      }
    }
  })
