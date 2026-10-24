import { Prisma } from '@prisma/client'

import { db } from './db'
import { BP_PROFILE_ALLOWED_CARD_TYPES, BP_PROFILE_TYPE, BpProfileRow, BpProfileType, bpProfileOptionCardTypes } from './user-bp-profile'

//? lives outside /actions so actions and verification scripts can both import it

export type BpProfileOption = { CardCode: string; CardName: string; GroupName: string | null }

export type BpProfileCompany = { dbCode: string; name: string; options: BpProfileOption[] }

const SAP_DATABASE_ORDER_BY = [{ order: 'asc' }, { name: 'asc' }] satisfies Prisma.SapDatabaseOrderByWithRelationInput[]

//* every active company with the cards its slot accepts
export async function getBpProfileCompanyOptions(profileType: BpProfileType): Promise<BpProfileCompany[]> {
  const companies = await db.sapDatabase.findMany({
    where: { isActive: true },
    select: { dbCode: true, name: true, isEnabledCustomTfsProcess: true },
    orderBy: SAP_DATABASE_ORDER_BY,
  })

  const partners = await db.businessPartner.findMany({
    where: { dbCode: { in: companies.map((company) => company.dbCode) }, CardType: { in: BP_PROFILE_ALLOWED_CARD_TYPES[profileType] } },
    select: { dbCode: true, CardCode: true, CardName: true, GroupName: true, CardType: true, syncStatus: true },
    orderBy: { CardCode: 'asc' },
  })

  const isSyncedStrict = process.env.NEXT_PUBLIC_SYNCED_STRICT === 'true'

  return companies.map((company) => {
    //* synced-only when strict mode is on and the company runs the custom tfs process
    const isSyncedOnly = isSyncedStrict && company.isEnabledCustomTfsProcess
    const cardTypes = bpProfileOptionCardTypes(profileType, isSyncedOnly)

    const options = partners
      .filter((partner) => partner.dbCode === company.dbCode && cardTypes.includes(partner.CardType))
      .filter((partner) => !isSyncedOnly || partner.syncStatus === 'synced')
      .map(({ CardCode, CardName, GroupName }) => ({ CardCode, CardName, GroupName }))

    return { dbCode: company.dbCode, name: company.name, options }
  })
}

//* first problem in the submitted rows, null when every row is fine
export async function findBpProfileRowError(rows: BpProfileRow[]) {
  if (rows.length < 1) return null

  const companies = await db.sapDatabase.findMany({
    where: { dbCode: { in: [...new Set(rows.map((row) => row.dbCode))] } },
    select: { dbCode: true, name: true, isActive: true },
  })
  const companyByCode = new Map(companies.map((company) => [company.dbCode, company]))

  const seen = new Set<string>()

  for (const row of rows) {
    const company = companyByCode.get(row.dbCode)
    const key = `${row.dbCode}|${row.profileType}`

    if (seen.has(key)) return `${company?.name ?? row.dbCode} is listed twice, reload the page`
    seen.add(key)

    if (!company?.isActive) return `${company?.name ?? row.dbCode} is no longer active, reload the page`
  }

  const withCard = rows.filter((row) => row.cardCode)
  if (withCard.length < 1) return null

  const partners = await db.businessPartner.findMany({
    where: { OR: withCard.map((row) => ({ dbCode: row.dbCode, CardCode: row.cardCode! })) },
    select: { dbCode: true, CardCode: true, CardType: true },
  })

  for (const row of withCard) {
    const partner = partners.find((item) => item.dbCode === row.dbCode && item.CardCode === row.cardCode)

    if (!partner || !BP_PROFILE_ALLOWED_CARD_TYPES[row.profileType].includes(partner.CardType)) {
      const slot = row.profileType === BP_PROFILE_TYPE.CUSTOMER ? 'customer' : 'supplier'
      return `${companyByCode.get(row.dbCode)!.name}: ${row.cardCode} is not a valid ${slot}, reload the page`
    }
  }

  return null
}

//* one card per user, company and slot — an empty code removes it
export async function syncUserBpProfile(
  tx: Prisma.TransactionClient,
  userCode: number,
  dbCode: string,
  profileType: BpProfileType,
  cardCode: string | null | undefined,
  userId: string | null
) {
  if (!cardCode) return tx.userBpProfile.deleteMany({ where: { userCode, dbCode, cardType: profileType } })

  return tx.userBpProfile.upsert({
    where: { userCode_dbCode_cardType: { userCode, dbCode, cardType: profileType } },
    create: { userCode, dbCode, cardType: profileType, cardCode, createdBy: userId, updatedBy: userId },
    update: { cardCode, updatedBy: userId },
  })
}

//* saves the submitted companies only, companies not sent keep their card
export async function saveBpProfileRows(tx: Prisma.TransactionClient, userCode: number, rows: BpProfileRow[], userId: string | null) {
  for (const row of rows) await syncUserBpProfile(tx, userCode, row.dbCode, row.profileType, row.cardCode, userId)
}
