'use server'

import { Prisma } from '@prisma/client'
import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { db } from '@/utils/db'

const COMMON_ROLE_REPORT_INCLUDE = {
  role: { select: { code: true, name: true } },
  report: true,
} as Prisma.RoleReportInclude

const COMMON_ROLE_REPORT_ORDER_BY = { report: { code: 'asc' } } satisfies Prisma.RoleReportOrderByWithRelationInput

export async function getRoleReportsByRoleCode(roleCode?: number | null) {
  if (!roleCode) return []

  try {
    return db.roleReport.findMany({
      where: { roleCode },
      include: COMMON_ROLE_REPORT_INCLUDE,
      orderBy: COMMON_ROLE_REPORT_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getRoleReportsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ roleCode: z.coerce.number().nullish() }))
  .action(async ({ ctx, parsedInput }) => {
    return getRoleReportsByRoleCode(parsedInput.roleCode)
  })
