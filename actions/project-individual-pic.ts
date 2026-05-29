'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PI_PIC_INCLUDE = {
  user: { select: { code: true, fname: true, lname: true, email: true } },
} satisfies Prisma.ProjectIndividualPicInclude
const COMMON_PI_PIC_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectIndividualPicOrderByWithRelationInput

export async function getPiPicsByProjectCode(projectCode?: number | null) {
  if (!projectCode) return []

  try {
    return db.projectIndividualPic.findMany({
      where: { projectIndividualCode: projectCode },
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
  .schema(z.object({ projectCode: z.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPiPicsByProjectCode(data.projectCode)
  })

export async function getPiPicsByUserCode(userCode?: number | null) {
  if (!userCode) return []

  try {
    return db.projectIndividualPic.findMany({ where: { userCode } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiPicsByUserCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ userCode: z.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPiPicsByUserCode(data.userCode)
  })
