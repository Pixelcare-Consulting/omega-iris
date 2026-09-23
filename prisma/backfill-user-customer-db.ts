//* Usage
//*   pnpm db:backfill:user-bp-db            —— dry run, prints what it would write
//*   pnpm db:backfill:user-bp-db --apply    —— writes the resolved rows
//*
//* fills User.customerDbCode / supplierDbCode for users saved before the column existed
//* a card code repeats across sap databases, so only an unambiguous single match is written
//! dry run by default, pass --apply to write
//! ambiguous and unmatched users stay null on purpose, fix those by re-picking in the user form

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const APPLY = process.argv.includes('--apply')

type Resolution = {
  userCode: number
  username: string
  field: 'customerDbCode' | 'supplierDbCode'
  cardCode: string
  dbCodes: string[]
}

//* reports any business partner pointing at a database row that no longer exists
//! the BusinessPartner -> SapDatabase foreign key cannot be created while these rows are around
async function checkOrphanBusinessPartners() {
  const [databases, partnerDbCodes] = await Promise.all([
    db.sapDatabase.findMany({ select: { dbCode: true } }),
    db.businessPartner.findMany({ distinct: ['dbCode'], select: { dbCode: true } }),
  ])

  const known = new Set(databases.map((database) => database.dbCode))

  return partnerDbCodes.map((partner) => partner.dbCode).filter((dbCode) => !known.has(dbCode))
}

async function main() {
  const orphans = await checkOrphanBusinessPartners()

  if (orphans.length > 0) {
    console.log('\n  ORPHAN BUSINESS PARTNER DATABASES')
    orphans.forEach((dbCode) => console.log(`    ${dbCode} — has no SapDatabase row`))
    console.log('\n  the BusinessPartner -> SapDatabase relation cannot be pushed until these are resolved\n')
  }

  //* only users that carry a card code but no database yet
  const users = await db.user.findMany({
    where: {
      OR: [
        { customerCode: { not: null }, customerDbCode: null },
        { supplierCode: { not: null }, supplierDbCode: null },
      ],
    },
    select: { code: true, username: true, customerCode: true, supplierCode: true },
    orderBy: { code: 'asc' },
  })

  const cardCodes = [...new Set(users.flatMap((user) => [user.customerCode, user.supplierCode]).filter((code): code is string => !!code))]

  const partners = await db.businessPartner.findMany({
    where: { CardCode: { in: cardCodes } },
    select: { CardCode: true, dbCode: true },
  })

  //* card code -> every database that defines it
  const dbCodesByCardCode = new Map<string, string[]>()

  for (const partner of partners) {
    const existing = dbCodesByCardCode.get(partner.CardCode) || []
    if (!existing.includes(partner.dbCode)) existing.push(partner.dbCode)
    dbCodesByCardCode.set(partner.CardCode, existing)
  }

  const resolved: Resolution[] = []
  const ambiguous: Resolution[] = []
  const notFound: Resolution[] = []

  for (const user of users) {
    const pairs = [
      { field: 'customerDbCode' as const, cardCode: user.customerCode },
      { field: 'supplierDbCode' as const, cardCode: user.supplierCode },
    ]

    for (const { field, cardCode } of pairs) {
      if (!cardCode) continue

      const dbCodes = dbCodesByCardCode.get(cardCode) || []
      const entry: Resolution = { userCode: user.code, username: user.username, field, cardCode, dbCodes }

      if (dbCodes.length === 1) resolved.push(entry)
      else if (dbCodes.length > 1) ambiguous.push(entry)
      else notFound.push(entry)
    }
  }

  const label = (entry: Resolution) => `#${entry.userCode} ${entry.username} ${entry.field.replace('DbCode', '')} ${entry.cardCode}`

  console.log(`\n  resolved   ${String(resolved.length).padStart(3)}`)
  resolved.forEach((entry) => console.log(`    ${label(entry)} -> ${entry.dbCodes[0]}`))

  console.log(`\n  AMBIGUOUS  ${String(ambiguous.length).padStart(3)}`)
  ambiguous.forEach((entry) => console.log(`    ${label(entry)} [${entry.dbCodes.join(', ')}]`))

  console.log(`\n  NOT FOUND  ${String(notFound.length).padStart(3)}`)
  notFound.forEach((entry) => console.log(`    ${label(entry)}`))

  if (!APPLY) {
    console.log('\n  dry run — nothing written. re-run with --apply\n')
    return
  }

  //* ambiguous and not found stay null on purpose, they get fixed by re-picking in the user form
  for (const entry of resolved) {
    await db.user.update({ where: { code: entry.userCode }, data: { [entry.field]: entry.dbCodes[0] } })
  }

  console.log(`\n  wrote ${resolved.length} user(s)\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
