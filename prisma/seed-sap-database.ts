//* Usage
//*   pnpm db:seed:sap-database    —— seeds the sap databases listed below
//*   pnpm db:seed                 —— runs this together with the dim date seed
//*
//* seeds the tenant list every dbCode in the app is scoped to
//! createMany, so re-running it on an already seeded database fails on the unique dbCode

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SAP_DB = [
  { dbCode: 'OMEGA_P02', name: 'OMEGA_P02', order: 1 },
  { dbCode: 'OMEGA_P02_TESTING', name: 'OMEGA_P02_TESTING', order: 2 },
  { dbCode: 'OMEGA_PHIL', name: 'OMEGA_PHIL', order: 3 },
  { dbCode: 'OMEGA_PHIL_TESTING', name: 'OMEGA_PHIL_TESTING', order: 4 },
]

async function main() {
  console.log('Generating SAP Databases...')

  await prisma.sapDatabase.createMany({ data: DEFAULT_SAP_DB })

  console.log('SAP Databases seeded successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
