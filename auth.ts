import 'next-auth/jwt'

import NextAuth, { NextAuthConfig } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'

import { db } from './utils/db'
import authConfig from './auth.config'

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
  isDefaultPasswordChanged: boolean
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
          isDefaultPasswordChanged: true,
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

      const { id, code, username, fname, lname, email, emailVerified, isActive, isOnline, isDefaultPasswordChanged, role } = existingUser

      //? NOTE: The SAP Service Layer session is NOT established here. Logging in from this callback opened a
      //? B1 session per user sign-in that was never cached nor logged out, holding a license slot until it
      //? timed out. SAP sessions are owned by getSapServiceLayerToken(), which caches and reuses a single one.

      const rolePermissions = role.rolePermissions.map((rp) => ({
        id: rp.permissionId,
        code: rp.permission.code,
        actions: rp.actions,
      }))

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
        rolePermissions,
        isActive,
        isOnline,
        isDefaultPasswordChanged,
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
    if (token.user) session.user = { ...token.user }

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
