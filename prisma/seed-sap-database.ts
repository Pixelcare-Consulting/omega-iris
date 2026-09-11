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
