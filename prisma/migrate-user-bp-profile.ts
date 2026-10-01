//* Usage
//*   pnpm db:migrate:user-bp-profile            —— dry run, prints what it would write
//*   pnpm db:migrate:user-bp-profile --apply    —— writes the new rows
//*
//* copies User customer/supplier card codes into UserBpProfile, one row per company
//* safe to re-run, rows already copied are skipped
//! dry run by default, pass --apply to write
//! ambiguous, not found and conflict rows are never written, fix those by re-picking in the user form

import { PrismaClient } from '@prisma/client'

import { BUSINESS_PARTNER_ROLE_KEY } from '@/constants/role'
import { BP_PROFILE_ALLOWED_CARD_TYPES } from '@/utils/user-bp-profile'

const db = new PrismaClient()

const APPLY = process.argv.includes('--apply')

type CardType = 'C' | 'S'

type Entry = {
  userCode: number
  username: string
  cardType: CardType
  cardCode: string
  dbCode: string | null
  notes: string[]
}

async function main() {
  const users = await db.user.findMany({
    where: { OR: [{ customerCode: { not: null } }, { supplierCode: { not: null } }] },
    select: {
      code: true,
      username: true,
      customerCode: true,
      customerDbCode: true,
      supplierCode: true,
      supplierDbCode: true,
      role: { select: { key: true } },
    },
    orderBy: { code: 'asc' },
  })

  //* one candidate per non-empty card on a user
  const candidates = users.flatMap((user) => {
    const roleNote = user.role.key === BUSINESS_PARTNER_ROLE_KEY ? [] : [`role is ${user.role.key}`]

    return [
      { cardType: 'C' as const, cardCode: user.customerCode, dbCode: user.customerDbCode },
      { cardType: 'S' as const, cardCode: user.supplierCode, dbCode: user.supplierDbCode },
    ]
      .filter((card): card is typeof card & { cardCode: string } => !!card.cardCode)
      .map((card) => ({ userCode: user.code, username: user.username, ...card, notes: [...roleNote] }) satisfies Entry)
  })

  const cardCodes = [...new Set(candidates.map((entry) => entry.cardCode))]

  const [partners, existingProfiles] = await Promise.all([
    db.businessPartner.findMany({
      where: { CardCode: { in: cardCodes } },
      select: { dbCode: true, CardCode: true, CardType: true, deletedAt: true },
    }),
    db.userBpProfile.findMany({
      where: { userCode: { in: users.map((user) => user.code) } },
      select: { userCode: true, dbCode: true, cardType: true, cardCode: true },
    }),
  ])

  const partnersByCardCode = new Map<string, typeof partners>()

  for (const partner of partners) partnersByCardCode.set(partner.CardCode, [...(partnersByCardCode.get(partner.CardCode) ?? []), partner])

  const existingByKey = new Map(
    existingProfiles.map((profile) => [`${profile.userCode}|${profile.dbCode}|${profile.cardType}`, profile.cardCode])
  )

  //* cards with no profile row yet, the only ones written on --apply
  const toCopy: Entry[] = []

  //* profile row already has the same card, skipped
  const alreadyCopied: Entry[] = []

  //* no stored dbCode and the card code is in 2+ companies, left for the user form
  const ambiguous: Entry[] = []

  //* card not found in the stored company, or in any company when no dbCode is stored
  const notFound: Entry[] = []

  //* profile row already has a different card, never overwritten
  const conflicts: Entry[] = []

  for (const entry of candidates) {
    const matches = partnersByCardCode.get(entry.cardCode) ?? []

    //* resolve the company, a stored dbCode wins over a lookup
    let partner = entry.dbCode ? matches.find((match) => match.dbCode === entry.dbCode) : undefined

    if (!entry.dbCode) {
      if (matches.length > 1) {
        ambiguous.push({ ...entry, notes: [...entry.notes, `in ${matches.map((match) => match.dbCode).join(', ')}`] })
        continue
      }
      partner = matches[0]
      if (partner) entry.notes.push('db looked up')
    }

    if (!partner) {
      notFound.push(entry)
      continue
    }

    const resolved: Entry = { ...entry, dbCode: partner.dbCode }

    if (partner.deletedAt) resolved.notes.push('card is soft-deleted')

    if (!BP_PROFILE_ALLOWED_CARD_TYPES[entry.cardType].includes(partner.CardType)) resolved.notes.push(`card type is ${partner.CardType}`)

    const existing = existingByKey.get(`${resolved.userCode}|${resolved.dbCode}|${resolved.cardType}`)

    if (existing === resolved.cardCode) alreadyCopied.push(resolved)
    else if (existing) conflicts.push({ ...resolved, notes: [...resolved.notes, `profile already has ${existing}`] })
    else toCopy.push(resolved)
  }

  const label = (entry: Entry) =>
    `#${entry.userCode} ${entry.username} ${entry.cardType} ${entry.cardCode}${entry.dbCode ? ` -> ${entry.dbCode}` : ''}` +
    (entry.notes.length ? `  (${entry.notes.join('; ')})` : '')

  const section = (title: string, entries: Entry[], print = true) => {
    console.log(`\n  ${title.padEnd(15)} ${String(entries.length).padStart(4)}`)
    if (print) entries.forEach((entry) => console.log(`    ${label(entry)}`))
  }

  section('to copy', toCopy)
  section('already copied', alreadyCopied, false)
  section('AMBIGUOUS', ambiguous)
  section('NOT FOUND', notFound)
  section('CONFLICT', conflicts)

  if (!APPLY) {
    console.log('\n  dry run — nothing written. re-run with --apply\n')
    return
  }

  //! skipDuplicates covers a row saved from the app between the read above and this write
  const result = await db.userBpProfile.createMany({
    data: toCopy.map((entry) => ({ userCode: entry.userCode, dbCode: entry.dbCode!, cardType: entry.cardType, cardCode: entry.cardCode })),
    skipDuplicates: true,
  })

  console.log(`\n  wrote ${result.count} profile row(s)\n`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
