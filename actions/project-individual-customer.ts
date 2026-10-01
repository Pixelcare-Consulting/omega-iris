'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'
import { BP_PROFILE_TYPE } from '@/utils/user-bp-profile'

//* the customer's card for this company only
function piCustomerInclude(dbCode: string) {
  return {
    user: {
      select: {
        code: true,
        fname: true,
        lname: true,
        email: true,
        bpProfiles: { where: { dbCode, cardType: BP_PROFILE_TYPE.CUSTOMER }, select: { cardCode: true } },
      },
    },
  } satisfies Prisma.ProjectIndividualCustomerInclude
}
const COMMON_PI_CUSTOMER_ORDER_BY = { user: { code: 'asc' } } satisfies Prisma.ProjectIndividualCustomerOrderByWithRelationInput

export async function getPiCustomersByProjectCode(dbCode: string, projectCode?: number | null) {
  if (!projectCode) return []

  try {
    return db.projectIndividualCustomer.findMany({
      where: { dbCode, projectIndividualCode: projectCode },
      include: piCustomerInclude(dbCode),
      orderBy: COMMON_PI_CUSTOMER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiCustomersByProjectCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ projectCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPiCustomersByProjectCode(ctx.dbCode, data.projectCode)
  })

export async function getPiCustomersByUserCode(dbCode: string, userCode?: number | null) {
  if (!userCode) return []

  try {
    return db.projectIndividualCustomer.findMany({ where: { dbCode, userCode } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiCustomerByUserCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ userCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPiCustomersByUserCode(ctx.dbCode, data.userCode)
  })
