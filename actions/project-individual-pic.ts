'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PI_PIC_INCLUDE = {
  user: { select: { code: true, fname: true, lname: true, email: true } },
} satisfies Prisma.ProjectIndividualPicInclude
const COMMON_PI_PIC_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectIndividualPicOrderByWithRelationInput

export async function getPiPicsByProjectCode(dbCode: string, projectCode?: number | null) {
  if (!projectCode) return []

  try {
    return db.projectIndividualPic.findMany({
      where: { dbCode, projectIndividualCode: projectCode },
      include: COMMON_PI_PIC_INCLUDE,
      orderBy: COMMON_PI_PIC_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiPicsByProjectCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ projectCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPiPicsByProjectCode(ctx.dbCode, data.projectCode)
  })

export async function getPiPicsByUserCode(dbCode: string, userCode?: number | null) {
  if (!userCode) return []

  try {
    return db.projectIndividualPic.findMany({ where: { dbCode, userCode } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiPicsByUserCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ userCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPiPicsByUserCode(ctx.dbCode, data.userCode)
  })
