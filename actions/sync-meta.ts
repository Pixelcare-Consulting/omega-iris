'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getSyncMetaByCode(code: string) {
  if (!code) return null

  try {
    return db.syncMeta.findUnique({ where: { code } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getSyncMetaByCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.string() }))
  .action(async ({ parsedInput }) => {
    return getSyncMetaByCode(parsedInput.code)
  })
