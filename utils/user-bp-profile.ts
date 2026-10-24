import type { Prisma } from '@prisma/client'

//* which slot a card fills on the user, not the business partner's sap card type
export const BP_PROFILE_TYPE = { CUSTOMER: 'C', SUPPLIER: 'S' } as const

export type BpProfileType = (typeof BP_PROFILE_TYPE)[keyof typeof BP_PROFILE_TYPE]

//* sap card types each slot accepts, a lead can be a user's customer
export const BP_PROFILE_ALLOWED_CARD_TYPES: Record<BpProfileType, string[]> = { C: ['C', 'L'], S: ['S'] }

export const BP_PROFILE_SELECT = {
  dbCode: true,
  cardType: true,
  cardCode: true,
  businessPartner: {
    select: { CardCode: true, CardName: true, GroupName: true, sapDatabase: { select: { dbCode: true, name: true } } },
  },
} satisfies Prisma.UserBpProfileSelect

//* the user's card for one company, null when none
export function pickBpProfile<T extends { dbCode: string; cardType: string }>(
  profiles: T[] | null | undefined,
  dbCode: string | null | undefined,
  cardType: BpProfileType
) {
  if (!profiles || !dbCode) return null
  return profiles.find((profile) => profile.dbCode === dbCode && profile.cardType === cardType) ?? null
}

//* synced-only companies drop leads, the same rule the single customer field had
export function bpProfileOptionCardTypes(profileType: BpProfileType, isSyncedOnly: boolean) {
  const allowed = BP_PROFILE_ALLOWED_CARD_TYPES[profileType]
  return isSyncedOnly ? allowed.filter((cardType) => cardType !== 'L') : allowed
}

export type BpProfileRow = { dbCode: string; profileType: BpProfileType; cardCode?: string | null }

//* one form row per listed company, filled from the saved card of that slot
export function buildBpProfileRows(
  companies: { dbCode: string }[],
  saved: { dbCode: string; cardType: string; cardCode: string }[] | null | undefined,
  profileType: BpProfileType
): BpProfileRow[] {
  return companies.map((company) => ({
    dbCode: company.dbCode,
    profileType,
    cardCode: pickBpProfile(saved, company.dbCode, profileType)?.cardCode ?? '',
  }))
}

//* the user's customer card in each company, one entry per company
export function getCustomerCards(
  profiles:
    | { dbCode: string; cardType: string; cardCode: string; businessPartner: { CardName: string; sapDatabase: { name: string } } }[]
    | null
    | undefined
) {
  return (profiles ?? [])
    .filter((profile) => profile.cardType === BP_PROFILE_TYPE.CUSTOMER)
    .map((profile) => ({
      dbCode: profile.dbCode,
      dbName: profile.businessPartner.sapDatabase.name,
      cardCode: profile.cardCode,
      cardName: profile.businessPartner.CardName,
    }))
}
