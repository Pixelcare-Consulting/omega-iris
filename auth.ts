import 'next-auth/jwt'

import NextAuth, { NextAuthConfig } from 'next-auth'
// import { authenticateSAPServiceLayer } from "./lib/sap-service-layer"
import { PrismaAdapter } from '@auth/prisma-adapter'
// import authConfig from "./auth.config"
import { db } from './utils/db'
// import { isProd } from './constants/common'
import authConfig from './auth.config'
// import { getUserById } from "./actions/user"

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
  sapSession?: { b1session: string; routeid: string }
}

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: ExtendedUser
  }
}

export const callbacks: NextAuthConfig['callbacks'] = {
  jwt: async ({ token, session, trigger }) => {
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
          role: true,
        },
      })

      if (!existingUser) return token

      const existingAccount = await db.account.findFirst({ where: { userId: existingUser.id } })

      const { id, code, username, fname, lname, email, emailVerified, isActive, isOnline, role } = existingUser

      //* user - fields only available after login and for the next subsequent calls it will be undefined
      //TODO: trigger authenticate SAP only once after login, on subsequent calls it will not be triggered

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
        rolePermissions: [],
        isActive,
        isOnline,
        isOAuth: !!existingAccount,
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
    if (token.user) session.user = token.user
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
