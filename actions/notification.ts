'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { getCurrentUserAbility } from './auth'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { NotificationForm, notificationFormSchema } from '@/schema/notification'
import logger from '@/utils/logger'
import { paramsSchema } from '@/schema/common'
import { PERMISSIONS_ALLOWED_ACTIONS } from '@/constants/permission'
import { add } from 'date-fns'
import { EXPIRESAT_MONTH_COUNT } from '@/constants/notification'

export async function getNotifications(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>, limit?: number) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { userCode, roleCode, roleKey } = userInfo

  try {
    //* get all notifications that the user has access to
    //* notifactions that has userCodes, roleCodes or roleKeys
    //* and are not expired
    //* and no or have recepit which deletedAt is null - means not deleted
    //* and not excluded
    return db.notification.findMany({
      where: {
        AND: [
          //* inclusion
          {
            OR: [{ isGlobal: true }, { userCodes: { has: userCode } }, { roleCodes: { has: roleCode } }, { roleKeys: { has: roleKey } }],
          },
          //* exclusion
          {
            NOT: [{ excludeUserCodes: { has: userCode } }, { excludeRoleCodes: { has: roleCode } }, { excludeRoleKeys: { has: roleKey } }],
          },
          //* expiration
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
        receipts: {
          none: {
            userCode: userCode,
            deletedAt: { not: null },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        receipts: {
          where: { userCode: userCode },
        },
      },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getNotificationsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ limit: z.coerce.number().optional() }))
  .action(async ({ ctx, parsedInput }) => {
    return getNotifications(ctx, parsedInput.limit)
  })

export async function getUnReadNotificationsCount(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return 0

  const { userCode, roleCode, roleKey } = userInfo

  try {
    //* count all unread notifications that the user has access to
    //* notifactions that has userCodes, roleCodes or roleKeys
    //* and are not expired
    //* and no or have recepit which deletedAt is null - means not deleted
    //* and no or have receipts which readAt is not null - means read
    return db.notification.count({
      where: {
        AND: [
          //* inclusion
          {
            OR: [{ isGlobal: true }, { userCodes: { has: userCode } }, { roleCodes: { has: roleCode } }, { roleKeys: { has: roleKey } }],
          },
          //* exclusion
          {
            NOT: [{ excludeUserCodes: { has: userCode } }, { excludeRoleCodes: { has: roleCode } }, { excludeRoleKeys: { has: roleKey } }],
          },
          //* expiration
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          {
            receipts: {
              none: {
                userCode: userCode,
                readAt: { not: null },
              },
            },
          },
        ],
        receipts: {
          none: {
            userCode: userCode,
            deletedAt: { not: null },
          },
        },
      },
    })
  } catch (error) {
    console.error(error)
    return 0
  }
}

export const getUnReadNotificationsCountClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getUnReadNotificationsCount(ctx)
})

export async function createNotification(
  userInfo: NonNullable<Awaited<ReturnType<typeof getCurrentUserAbility>>>,
  notificationData: NotificationForm,
  options: { skipNotify?: boolean } = {
    skipNotify: false, //* by default the user that trigger the notification will be notified, if true then will not be notified
  }
) {
  const { permissionCode, userCodes, excludeUserCodes, excludeRoleCodes, excludeRoleKeys, ...data } = notificationData
  const { userId, userCode, roleCode, roleKey, ability } = userInfo

  try {
    //* get allowed roles based on the permission code and it should allowed to 'receive notifications'
    //* for related notifications of the user will be included in the userCodes which will be pass to this function
    //* if the role of the user has 'received notification (owner)' then the userCodes will be included in the notification, will be handleed outside of this function
    const allowedRoles = await db.role.findMany({
      where: {
        OR: [
          { key: 'admin' },
          {
            rolePermissions: {
              some: {
                permission: { code: permissionCode },
                actions: { has: PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS },
              },
            },
          },
        ],
      },
      select: { code: true, key: true },
    })

    const roleCodes = allowedRoles.map((r) => r.code)
    const roleKeys = allowedRoles.map((r) => r.key)
    const expiresAt = add(new Date(), { months: EXPIRESAT_MONTH_COUNT })

    const canReceivedNotifOwned = ability?.can(PERMISSIONS_ALLOWED_ACTIONS.RECEIVE_NOTIFICATIONS_OWNER, permissionCode)

    const uniqueUserCodes = [...new Set(userCodes)]
    const uniqueRoleCodes = [...new Set(roleCodes)]
    const uniqueRoleKeys = [...new Set(roleKeys)]

    const unqiueExcludeUserCodes = [...new Set(excludeUserCodes)]
    const unqiueExcludeRoleCodes = [...new Set(excludeRoleCodes)]
    const unqiueExcludeRoleKeys = [...new Set(excludeRoleKeys)]

    //* if user are allowed to received notifications (owner) and userCode does not included yet in uniqueUserCodes
    if (canReceivedNotifOwned && !uniqueUserCodes.includes(userCode) && !options.skipNotify) uniqueUserCodes.push(userCode)

    //* if skipNotify is true then exclude the userCode, roleCode, roleKey from the notification
    if (options.skipNotify) {
      unqiueExcludeUserCodes.push(userCode)
      unqiueExcludeRoleCodes.push(roleCode)
      unqiueExcludeRoleKeys.push(roleKey)
    }

    await db.notification.create({
      data: {
        ...data,
        //* auidience/recepients
        userCodes: uniqueUserCodes,
        roleCodes: uniqueRoleCodes,
        roleKeys: uniqueRoleKeys,
        //* exclusion
        excludeUserCodes: unqiueExcludeUserCodes,
        excludeRoleCodes: unqiueExcludeRoleCodes,
        excludeRoleKeys: unqiueExcludeRoleKeys,
        createdBy: userId,
        expiresAt,
      },
    })

    return {
      status: 200,
      message: 'Notification created successfully!',
      action: 'CREATE_NOTIFICATION',
    }
  } catch (error) {
    logger.error(error, 'Failed to create notification')
    logger.error(`PERMISSION_CODES: ${permissionCode}`)

    return {
      error: true,
      status: 500,
      message: error instanceof Error ? error.message : 'Something went wrong!',
      action: 'CREATE_NOTIFICATION',
    }
  }
}

export const createNotificationClient = action
  .use(authenticationMiddleware)
  .schema(notificationFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    return createNotification(ctx, parsedInput)
  })

export const toggleNotificationRead = action
  .use(authenticationMiddleware)
  .schema(
    z.object({
      notificationCode: z.coerce.number(),
      isRead: z.boolean(),
    })
  )
  .action(async ({ ctx, parsedInput }) => {
    const { notificationCode, isRead } = parsedInput

    try {
      const notifReceipt = await db.notificationReceipt.upsert({
        where: {
          notificationCode_userCode: {
            notificationCode,
            userCode: ctx.userCode,
          },
        },
        create: { notificationCode, userCode: ctx.userCode, readAt: isRead ? new Date() : null },
        update: { notificationCode, userCode: ctx.userCode, readAt: isRead ? new Date() : null },
      })

      return {
        status: 200,
        message: `Notification marked as ${isRead ? 'read' : 'unread'} successfully!`,
        action: `MARK_NOTIFICATION_AS_${isRead ? 'READ' : 'UNREAD'}`,
        data: { notificationReceipt: notifReceipt },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: `MARK_NOTIFICATION_AS_${isRead ? 'READ' : 'UNREAD'}`,
      }
    }
  })

export const toggleAllNotificationsRead = action
  .use(authenticationMiddleware)
  .schema(z.object({ isRead: z.boolean() }))
  .action(async ({ ctx, parsedInput }) => {
    const { isRead } = parsedInput

    const { userCode, roleCode, roleKey } = ctx

    try {
      //* get all notifications that the user has access to
      //* notifactions that has userCodes, roleCodes or roleKeys
      //* and are not expired
      //* and no or have recepit which deletedAt is null - means not deleted
      const notifications = await db.notification.findMany({
        where: {
          AND: [
            {
              OR: [{ isGlobal: true }, { userCodes: { has: userCode } }, { roleCodes: { has: roleCode } }, { roleKeys: { has: roleKey } }],
            },
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
          receipts: {
            none: {
              userCode: userCode,
              deletedAt: { not: null },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      })

      const notificationCodes = notifications.map((n) => n.code)

      if (notificationCodes.length < 1) {
        return {
          error: true,
          status: 404,
          message: 'No notifications found!',
          action: `MARK_ALL_NOTIFICATIONS_AS_${isRead ? 'READ' : 'UNREAD'}`,
        }
      }

      await db.$transaction(async (tx) => {
        await Promise.all(
          notificationCodes.map((code) => {
            return tx.notificationReceipt.upsert({
              where: {
                notificationCode_userCode: {
                  notificationCode: code,
                  userCode: ctx.userCode,
                },
              },
              create: { notificationCode: code, userCode: ctx.userCode, readAt: isRead ? new Date() : null },
              update: { notificationCode: code, userCode: ctx.userCode, readAt: isRead ? new Date() : null },
            })
          })
        )
      })

      return {
        status: 200,
        message: `All Notifications marked as ${isRead ? 'read' : 'unread'} successfully!`,
        action: `MARK_ALL_NOTIFICATIONS_AS_${isRead ? 'READ' : 'UNREAD'}`,
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: `MARK_ALL_NOTIFICATIONS_AS_${isRead ? 'READ' : 'UNREAD'}`,
      }
    }
  })

export const deleteNotification = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const notification = await db.notification.findUnique({ where: { code: data.code } })

      if (!notification) return { error: true, status: 404, message: 'Notification not found!', action: 'DELETE_NOTIFICATION' }

      await db.notificationReceipt.update({
        where: {
          notificationCode_userCode: {
            notificationCode: data.code,
            userCode: ctx.userCode,
          },
        },
        data: { deletedAt: new Date() },
      })

      return { status: 200, message: 'Notification deleted successfully!', action: 'DELETE_NOTIFICATION' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_NOTIFICATION',
      }
    }
  })
