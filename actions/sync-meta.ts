'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { areJobsEnabled, getJobSchedule } from '@/utils/jobs/scheduler'

export async function getSyncMetaByCode(dbCode: string, code: string) {
  if (!code) return null

  try {
    return db.syncMeta.findUnique({ where: { dbCode_code: { dbCode, code } } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getSyncMetaByCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ code: z.coerce.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getSyncMetaByCode(ctx.dbCode, parsedInput.code)
  })

//* the schedule the scheduler really uses, so the ui can never show a stale interval when the env var changes
export const getJobScheduleClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.string() }))
  .action(async ({ parsedInput }) => {
    return { schedule: getJobSchedule(parsedInput.code), isEnabled: areJobsEnabled() }
  })
