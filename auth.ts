import 'next-auth/jwt'

import NextAuth, { NextAuthConfig } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'

import { db } from './utils/db'
import authConfig from './auth.config'
import logger from './utils/logger'
import { authenticateSapServiceLayer } from './actions/sap-service-layer'
import { SapAuthCookies, SapCredentials } from './types/sap'

//* module augmentation for next-auth
export type ExtendedUser = {
  id: string
  code: number
  username: string
  fname: string
  lname: string
  email: string
  emailVerified: Date | null
  roleKey: string
  roleCode: number
  roleName: string
  rolePermissions: { id: string; code: string; actions: string[] }[]
  isOnline: boolean
  isActive: boolean
  isOAuth: boolean
  sapSession: SapAuthCookies | null
}

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: ExtendedUser
    sapSession: SapAuthCookies | null
  }
}

export const callbacks: NextAuthConfig['callbacks'] = {
  jwt: async ({ token, session, trigger, user }) => {
    try {
      //* anything returned here will be saved in the JWT and forwarded to the session callback

      if (!token.sub) return token

      //* query existing user based on token.sub (userID)
      //* fetching the the user using the token.sub, make sure to get the up to date data of the user
      const existingUser = await db.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          code: true,
          username: true,
          fname: true,
          lname: true,
          email: true,
          emailVerified: true,
          isActive: true,
          isOnline: true,
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      })

      if (!existingUser) return token

      const existingAccount = await db.account.findFirst({ where: { userId: existingUser.id } })

      const { id, code, username, fname, lname, email, emailVerified, isActive, isOnline, role } = existingUser

      //* user - fields only available after login and for the next subsequent calls it will be undefined
      //* trigger authenticate SAP only once after login, on subsequent calls it will not be triggered
      if (user) {
        //* Authenticate with SAP Service Layer and add session to token
        //* Only do this in Node.js environment, not in Edge Runtime

        const credentials: SapCredentials = {
          baseUrl: process.env.SAP_BASE_URL || '',
          companyDb: process.env.SAP_COMPANY_DB || '',
          userName: process.env.SAP_USERNAME || '',
          password: process.env.SAP_PASSWORD || '',
        }

        const authCookies = await authenticateSapServiceLayer(credentials)

        if (
          authCookies.error ||
          !authCookies?.data ||
          !authCookies?.data?.sapSession ||
          !authCookies?.data?.sapSession?.b1session ||
          !authCookies?.data?.sapSession?.routeid
        ) {
          logger.error(`SAP Service Layer authentication failed: ${authCookies?.message}`)
          token.sapSession = null
        } else token.sapSession = authCookies.data.sapSession
      }

      token.user = {
        id,
        code,
        username,
        fname,
        lname,
        email,
        emailVerified,
        roleKey: role.key,
        roleCode: role.code,
        roleName: role.name,
        rolePermissions: role.rolePermissions.map((rp) => ({
          id: rp.permissionId,
          code: rp.permission.code,
          actions: rp.actions,
        })),
        isActive,
        isOnline,
        isOAuth: !!existingAccount,
        sapSession: null,
      }

      //* update token.user when triggered update of session
      if (trigger === 'update') token.user = session.user

      return token
    } catch (error) {
      console.error('Error in JWT callback:', error)
      return token
    }
  },
  session: async ({ token, session }) => {
    //* anything returned here will be avaible to the client
    if (token.user) {
      session.user = {
        ...token.user,
        sapSession: token.sapSession,
      }
    }

    return session
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  callbacks,
  pages: {
    signIn: '/signin',
    error: '/auth-error',
  },
  ...authConfig,
})
