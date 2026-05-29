'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PG_PIC_INCLUDE = {
  user: { select: { code: true, fname: true, lname: true, email: true } },
} satisfies Prisma.ProjectGroupPicInclude
const COMMON_PG_PIC_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectGroupPicOrderByWithRelationInput

export async function getPgPicsByGroupCode(groupCode?: number | null) {
  if (!groupCode) return []

  try {
    return db.projectGroupPic.findMany({
      where: { projectGroupCode: groupCode },
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
  .schema(z.object({ groupCode: z.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPgPicsByGroupCode(data.groupCode)
  })

export async function getPgPicsByUserCode(userCode?: number | null) {
  if (!userCode) return []

  try {
    return db.projectGroupPic.findMany({ where: { userCode } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPgPicsByUserCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ userCode: z.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPgPicsByUserCode(data.userCode)
  })
