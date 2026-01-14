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
import { getSapServiceLayerToken } from './sap-auth'
import { buildAbilityFor } from '@/utils/acl'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export async function getCurrentUserAbility() {
  const session = await auth()

  if (!session?.user) return null
  const { id, code, roleCode, roleKey, roleName, rolePermissions } = session.user

  return {
    userId: id,
    userCode: code,
    roleCode,
    roleKey,
    roleName,
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

    if (!user || !user.email || !user.password) {
      return { error: true, code: 401, message: 'User does not exist!', action: 'SIGNIN_USER' }
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
      data: { lastIpAddress: ip, location: location, lastSignin: new Date() },
    })

    //* Authenticate with SAP Service Layer after successful application login'
    let sapConnectionStatus = 'unknown'
    let sapErrorMessage = ''

    const response = await getSapServiceLayerToken()

    if (response.error || !response?.data?.sapSession || !response?.data?.sapSession?.b1session || !response?.data?.sapSession?.routeid) {
      sapConnectionStatus = 'failed'
      sapErrorMessage = response.message
    } else sapConnectionStatus = 'connected'

    return {
      status: 200,
      message: 'Signin successful!',
      action: 'SIGNIN_USER',
      redirectUrl: callbackUrl || DEFAULT_SIGNIN_REDIRECT,
      sapConnection: { sapConnectionStatus, sapErrorMessage },
    }
  } catch (err) {
    if (err instanceof AuthError) {
      const authError = err as any

      console.log({ authError })

      switch (authError?.code) {
        case 'credentials':
          return { error: true, status: 401, message: 'Invalid Credentials!', action: 'SIGNIN_USER' }
        default:
          return { error: true, status: 500, message: 'Failed to login! Please try again later.', action: 'SIGNIN_USER' }
      }
    }

    throw err //* need to throw error here else redirect not working for some reason in auth.js
  }
})
