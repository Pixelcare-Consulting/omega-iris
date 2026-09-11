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
  sapDbCode: string | null
}

declare module 'next-auth' {
  interface Session {
    user: ExtendedUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: ExtendedUser
    //! keep at the top level — token.user is rebuilt from the db on every refresh and would drop it
    sapDbCode?: string
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
        sapDbCode: token.sapDbCode ?? null,
      }

      //* update token.user when triggered update of session
      if (trigger === 'update') {
        //* dbCode comes from the client — check it is a real, active database first
        if ('sapDbCode' in (session ?? {})) {
          //* the database must be active and assigned to the user's role, admin may use any
          const sapDatabase = session.sapDbCode
            ? await db.sapDatabase.findFirst({
                where: {
                  dbCode: session.sapDbCode,
                  isActive: true,
                  ...(role.key !== 'admin' && { roleSapDatabases: { some: { roleCode: role.code } } }),
                },
              })
            : null

          token.sapDbCode = sapDatabase?.dbCode
        }

        if (session?.user) token.user = session.user
      }

      //* mirror onto token.user so call sites stay on session.user
      token.user.sapDbCode = token.sapDbCode ?? null

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
