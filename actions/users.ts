'use server'

import bcrypt from 'bcryptjs'
import { capitalize } from 'radash'
import { Prisma } from '@prisma/client'
import z from 'zod'

import { paramsSchema } from '@/schema/common'
import { basicInfoFormSchema, changePasswordFormSchema, userFormSchema } from '@/schema/user'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'
import { DuplicateFields } from '@/types/common'

const COMMON_USER_INCLUDE = {
  role: true,
  profile: true,
} satisfies Prisma.UserInclude

export async function getUsers() {
  try {
    return await db.user.findMany({
      where: { deletedAt: null, deletedBy: null },
      include: COMMON_USER_INCLUDE,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getUsersClient = action.use(authenticationMiddleware).action(async () => {
  return getUsers()
})

export async function getNonCustomerUsers() {
  try {
    return await db.user.findMany({
      where: { role: { key: { not: 'customer' } }, deletedAt: null, deletedBy: null },
      include: COMMON_USER_INCLUDE,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getNonCustomerUsersClient = action.use(authenticationMiddleware).action(async () => {
  return getNonCustomerUsers()
})

export async function getUserByEmail(email: string) {
  if (!email) return null

  try {
    return await db.user.findUnique({ where: { email }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export async function getUserByUsername(username: string) {
  if (!username) return null

  try {
    return await db.user.findUnique({ where: { username }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export async function getUserById(id: string) {
  if (!id) return null

  try {
    return await db.user.findUnique({ where: { id }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export const getUserByIdClient = action
  .schema(z.object({ id: z.string().nullish() }))
  .use(authenticationMiddleware)
  .action(async ({ parsedInput: data }) => {
    if (!data.id) return null
    return getUserById(data.id)
  })

export async function getUserByCode(code: number) {
  if (!code) return null

  try {
    return await db.user.findUnique({ where: { code }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return null
  }
}

export async function getUsersByRoleKey(key: string) {
  if (!key) return []

  try {
    return await db.user.findMany({ where: { role: { key } }, include: COMMON_USER_INCLUDE })
  } catch (err) {
    return []
  }
}

export const getUsersByRoleKeyClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ key: z.string() }))
  .action(async ({ parsedInput: data }) => {
    return getUsersByRoleKey(data.key)
  })

export async function getAccountByUserId(id: string) {
  if (!id) return null

  try {
    return await db.account.findFirst({ where: { userId: id } })
  } catch (err) {
    return null
  }
}

export const upsertUser = action
  .use(authenticationMiddleware)
  .schema(userFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, password, confirmPassword, oldPassword, newPassword, newConfirmPassword, roleKey, ...data } = parsedInput
    const { userId } = ctx

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

      //* update user
      if (code !== -1) {
        const user = await db.user.findUnique({ where: { code } })

        if (!user) return { error: true, status: 404, message: 'User not found!', action: 'UPSERT_USER' }

        let hashedPassword = user.password

        if (oldPassword && newPassword) {
          //* if old password is provided, check if it matches the current password
          if (user.password) {
            const isPasswordMatch = await bcrypt.compare(oldPassword, user.password)
            if (!isPasswordMatch) return { error: true, status: 409, message: 'Old password does not match', action: 'UPSERT_USER' }
          }

          hashedPassword = await bcrypt.hash(newPassword, 10)
        }

        const updatedUser = await db.user.update({
          where: { code },
          data: { ...data, password: hashedPassword, updatedBy: userId },
        })

        return { status: 200, message: 'User updated successfully!', data: { user: updatedUser }, action: 'UPSERT_USER' }
      }

      const hashedPassword = await bcrypt.hash(password!, 10)

      //* create user
      const newUser = await db.user.create({
        data: {
          ...data,
          password: hashedPassword,
          createdBy: userId,
          updatedBy: userId,
          profile: {
            create: { details: {} },
          },
        },
      })

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
    const { code, oldPassword, newPassword, newConfirmPassword } = parsedInput
    const { userId } = ctx

    try {
      //* update user
      const user = await db.user.findUnique({ where: { code } })

      if (!user) return { error: true, status: 404, message: 'User not found!', action: 'UPDATE_PROFILE_CHANGE_PASSWORD' }

      let hashedPassword = user.password

      if (oldPassword && newPassword) {
        //* if old password is provided, check if it matches the current password
        if (user.password) {
          const isPasswordMatch = await bcrypt.compare(oldPassword, user.password)
          if (!isPasswordMatch)
            return { error: true, status: 409, message: 'Old password does not match', action: 'UPDATE_PROFILE_CHANGE_PASSWORD' }
        }

        hashedPassword = await bcrypt.hash(newPassword, 10)
      }

      const updatedUser = await db.user.update({
        where: { code },
        data: { password: hashedPassword, updatedBy: userId },
      })

      return {
        status: 200,
        message: 'Password changed successfully!',
        data: { user: updatedUser },
        action: 'UPDATE_PROFILE_CHANGE_PASSWORD',
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
