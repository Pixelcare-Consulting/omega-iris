import { Prisma } from '@prisma/client'

import { db } from './db'

//? NOTE: this lives outside /actions on purpose. safe-action.ts cannot import a file that uses `action`
//? without creating a circular dependency, and tenantMiddleware needs these checks.

export const SAP_DATABASE_ACCESS_WHERE = { isActive: true } satisfies Prisma.SapDatabaseWhereInput

export const SAP_DATABASE_ACCESS_ORDER_BY = [{ order: 'asc' }, { name: 'asc' }] satisfies Prisma.SapDatabaseOrderByWithRelationInput[]

//* databases a role may use, admin always gets all of them
export async function getSapDatabasesForRole(roleCode?: number | null) {
  if (!roleCode) return []

  try {
    const role = await db.role.findUnique({ where: { code: roleCode } })
    if (!role) return []

    return db.sapDatabase.findMany({
      where: {
        ...SAP_DATABASE_ACCESS_WHERE,
        ...(role.key !== 'admin' && { roleSapDatabases: { some: { roleCode } } }),
      },
      orderBy: SAP_DATABASE_ACCESS_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

//* true when the role may work in the given database
export async function isSapDatabaseAllowedForRole(dbCode: string, roleCode?: number | null) {
  const sapDatabases = await getSapDatabasesForRole(roleCode)
  return sapDatabases.some((sapDb) => sapDb.dbCode === dbCode)
}

//* one lookup for callers that need to know both whether the database is still allowed and
//* whether the role has any other database left to fall back to
export async function getSapDatabaseAccess(dbCode?: string | null, roleCode?: number | null) {
  const sapDatabases = await getSapDatabasesForRole(roleCode)

  return {
    sapDatabases,
    isAllowed: !!dbCode && sapDatabases.some((sapDb) => sapDb.dbCode === dbCode),
    hasAnySapDatabase: sapDatabases.length > 0,
  }
}
