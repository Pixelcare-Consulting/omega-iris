'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

import { auth, signIn } from '@/auth'
import { signinFormSchema } from '@/schema/auth'
import { action } from '@/utils/safe-action'
import { getUserByEmail } from './users'
import { DEFAULT_SIGNIN_REDIRECT } from '@/constants/route'
import { db } from '@/utils/db'
import { getClientInfo, getLocationFromIp } from './common'
import logger from '@/utils/logger'
import { cookies } from 'next/headers'
import { buildAbilityFor } from '@/utils/acl'
import { safeParseInt } from '@/utils'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function getCurrentUserAbility() {
  const session = await auth()

  if (!session?.user) return null
  const { id, code, roleCode, roleKey, roleName, rolePermissions, sapDbCode } = session.user

  return {
    userId: id,
    userCode: code,
    roleCode,
    roleKey,
    roleName,
    //* null when no database is selected, matches ctx.dbCode from authenticationMiddleware
    dbCode: sapDbCode ?? null,
    ability: buildAbilityFor({ roleKey: roleKey, rolePermissions: roleKey === 'admin' ? [] : rolePermissions }),
  }
}

async function cleanupSessionTokens() {
  try {
    const cookieStore = await cookies()
    const sessionTokens = cookieStore.getAll().filter((cookie) => cookie.name.startsWith('authjs.session-token'))

    //* Keep only the most recent token
    sessionTokens.slice(1).forEach((cookie) => cookieStore.delete(cookie.name))
    if (sessionTokens.length > 1) logger.info(`Cleaned ${sessionTokens.length - 1} SAP Session Tokens`)
  } catch (error) {
    logger.error(`Failed to clean SAP Session Token: ${error}`)
  }
}

export const signInUser = action.schema(signinFormSchema).action(async ({ parsedInput: data }) => {
  const { email, password, callbackUrl } = data

  try {
    const user = await getUserByEmail(email)

    //* Check if user exists
    if (!user || !user.email || !user.password) {
      //* same wording as a wrong password, so the message never reveals which emails are registered
      return {
        error: true,
        code: 401,
        message: 'The email or password you entered is incorrect. Please check your details and try again.',
        action: 'SIGNIN_USER',
      }
    }

    //* check if user is locked
    if (user.isLocked) {
      return {
        error: true,
        code: 401,
        message: 'Your account is locked after too many failed sign-in attempts. Please contact your administrator to unlock it.',
        action: 'SIGNIN_USER',
      }
    }

    //* Clean up any existing session tokens
    await cleanupSessionTokens()

    //? IMPORTANT: DO NOT use redirectTo here, let the client handle redirects when implementing SAP Authentication
    await signIn('credentials', {
      email,
      password,
      redirect: false,
      // redirectTo: callbackUrl || DEFAULT_SIGNIN_REDIRECT, // TODO: make  redirect = false when implementing SAP Authehtication
    })

    //* get client ip & location
    const ip = await getClientInfo()
    const location = await getLocationFromIp(ip)

    //* update user
    await db.user.update({
      where: { code: user.code },
      data: { lastIpAddress: ip, location: location, lastSignin: new Date(), failedLoginAttempts: 0 },
    })

    //* no SAP call here, the database is chosen after signin and there is nothing to connect to yet
    return {
      status: 200,
      message: 'Signin successful!',
      action: 'SIGNIN_USER',
      redirectUrl: callbackUrl || DEFAULT_SIGNIN_REDIRECT,
      role: {
        id: user.role.id,
        key: user.role.key,
        name: user.role.name,
        code: user.role.code,
      },
    }
  } catch (err) {
    if (err instanceof AuthError) {
      const authError = err as any
      const maxSigninAttempts = safeParseInt(process.env.SIGNIN_MAXIMUM_ATTEMPTS) || 5

      switch (authError?.code) {
        case 'credentials': {
          const user = await getUserByEmail(email)

          //* if user exist, not locked and user's failed sigin attempts does not reach the limit, then increase failed signin attempts
          if (user && !user.isLocked && user.failedLoginAttempts < maxSigninAttempts) {
            await db.user.update({
              where: { code: user.code },
              data: { failedLoginAttempts: { increment: 1 } },
            })
          }

          //* if user exist , not locked  and user's failed sigin attempts reach the limit, then lock the user
          if (user && !user.isLocked && user.failedLoginAttempts >= maxSigninAttempts - 1) {
            await db.user.update({
              where: { code: user.code },
              data: { isLocked: true },
            })
          }

          return {
            error: true,
            status: 401,
            message: 'The email or password you entered is incorrect. Please check your details and try again.',
            action: 'SIGNIN_USER',
          }
        }
        default:
          return {
            error: true,
            status: 500,
            message: 'We could not complete your sign-in. Please try again in a moment, or contact your administrator if it continues.',
            action: 'SIGNIN_USER',
          }
      }
    }

    throw err //* need to throw error here else redirect not working for some reason in auth.js
  }
})
