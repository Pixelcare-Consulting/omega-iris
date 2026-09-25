'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_PI_SUPPLIER_INCLUDE = {
  businessPartner: { select: { code: true, CardCode: true, CardName: true } },
} satisfies Prisma.ProjectIndividualSupplierInclude
const COMMON_PI_SUPPLIER_ORDER_BY = { businessPartner: { CardName: 'asc' } } satisfies Prisma.ProjectIndividualSupplierOrderByWithRelationInput

export async function getPiSuppliersByProjectCode(dbCode: string, projectCode?: number | null) {
  if (!projectCode) return []

  try {
    return db.projectIndividualSupplier.findMany({
      where: { dbCode, projectIndividualCode: projectCode },
      include: COMMON_PI_SUPPLIER_INCLUDE,
      orderBy: COMMON_PI_SUPPLIER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPiSuppliersByProjectCodeClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ projectCode: z.number().nullish() }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPiSuppliersByProjectCode(ctx.dbCode, data.projectCode)
  })
