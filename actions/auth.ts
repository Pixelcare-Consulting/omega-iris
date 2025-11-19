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

export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

export const signInUser = action.schema(signinFormSchema).action(async ({ parsedInput: data }) => {
  const { email, password, callbackUrl } = data

  try {
    const user = await getUserByEmail(email)

    if (!user || !user.email || !user.password) {
      return { error: true, code: 401, message: 'User does not exist!', action: 'SIGNIN_USER' }
    }

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

    redirect(callbackUrl || DEFAULT_SIGNIN_REDIRECT)

    //TODO: Authenticate with SAP Service Layer after successful application login
  } catch (err) {
    if (err instanceof AuthError) {
      const authError = err as any

      console.log({ authError })

      switch (authError?.code) {
        case 'credentials':
          return { error: true, code: 401, message: 'Invalid Credentials!', action: 'SIGNIN_USER' }
        default:
          return { error: true, code: 500, message: 'Failed to login! Please try again later.', action: 'SIGNIN_USER' }
      }
    }

    throw err //* need to throw error here else redirect not working for some reason in auth.js
  }
})
