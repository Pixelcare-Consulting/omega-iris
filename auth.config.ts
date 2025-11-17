import bcrypt from 'bcryptjs'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { signinFormSchema } from './schema/auth'
import { db } from './utils/db'

export default {
  providers: [
    Credentials({
      authorize: async (credentials, request) => {
        try {
          const validatedFields = signinFormSchema.safeParse(credentials)

          if (validatedFields.success) {
            const { username, password } = validatedFields.data

            const user = await db.user.findUnique({ where: { username }, include: { role: true } })

            if (!user || !user.password) return null

            const isPasswordMatch = await bcrypt.compare(password, user.password)

            if (isPasswordMatch) return { id: user.id, email: user.email, name: user.username }
          }

          return null
        } catch (error) {
          return null
        }
      },
    }),
  ],
} satisfies NextAuthConfig
