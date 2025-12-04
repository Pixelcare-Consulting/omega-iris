'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PI_CUSTOMER_INCLUDE = {
  user: true,
} satisfies Prisma.ProjectIndividualCustomerInclude
const COMMON_PI_CUSTOMER_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectIndividualCustomerOrderByWithRelationInput

export async function getPiCustomersByProjectCode(projectCode?: number | null) {
  if (!projectCode) return []

  try {
    return await db.projectIndividualCustomer.findMany({
      where: { projectIndividualCode: projectCode },
      include: COMMON_PI_CUSTOMER_INCLUDE,
      orderBy: COMMON_PI_CUSTOMER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiCustomersByProjectCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ projectCode: z.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPiCustomersByProjectCode(data.projectCode)
  })
