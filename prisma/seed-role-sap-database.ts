//* Usage
//*   pnpm db:seed:role-sap-database                         —— gives every active role access to every sap database
//*   pnpm db:seed:role-sap-database OMEGA_P02 OMEGA_PHIL    —— only the listed sap databases, any number of codes
//*
//* safe to re-run, existing links are left as they are
//! run after db:seed:sap-database, the links need the sap database rows

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DB_CODES = process.argv.slice(2)

async function main() {
  console.log('Generating Role SAP Databases...')

  const [roles, databases] = await Promise.all([
    prisma.role.findMany({ select: { code: true }, where: { deletedAt: null } }),
    prisma.sapDatabase.findMany({ where: DB_CODES.length > 0 ? { dbCode: { in: DB_CODES } } : {}, select: { dbCode: true } }),
  ])

  //* codes with no sap database row are skipped
  const unknown = DB_CODES.filter((dbCode) => !databases.some((database) => database.dbCode === dbCode))

  if (unknown.length > 0) console.log(`Skipped unknown SAP database(s): ${unknown.join(', ')}`)

  for (const role of roles) {
    for (const database of databases) {
      await prisma.roleSapDatabase.upsert({
        where: { roleCode_sapDatabaseCode: { roleCode: role.code, sapDatabaseCode: database.dbCode } },
        create: { roleCode: role.code, sapDatabaseCode: database.dbCode },
        update: {},
      })
    }
  }

  console.log(
    `Role SAP Databases seeded successfully! (${roles.length} roles x ${databases.map((database) => database.dbCode).join(', ')})`
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
