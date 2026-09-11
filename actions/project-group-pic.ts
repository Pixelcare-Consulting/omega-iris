'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PG_PIC_INCLUDE = {
  user: { select: { code: true, fname: true, lname: true, email: true } },
} satisfies Prisma.ProjectGroupPicInclude
const COMMON_PG_PIC_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectGroupPicOrderByWithRelationInput

export async function getPgPicsByGroupCode(dbCode: string, groupCode?: number | null) {
  if (!groupCode) return []

  try {
    return db.projectGroupPic.findMany({
      where: { dbCode, projectGroupCode: groupCode },
      include: COMMON_PG_PIC_INCLUDE,
      orderBy: COMMON_PG_PIC_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPgPicsByGroupCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ groupCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPgPicsByGroupCode(ctx.dbCode, data.groupCode)
  })

export async function getPgPicsByUserCode(dbCode: string, userCode?: number | null) {
  if (!userCode) return []

  try {
    return db.projectGroupPic.findMany({ where: { dbCode, userCode } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPgPicsByUserCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ userCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPgPicsByUserCode(ctx.dbCode, data.userCode)
  })
