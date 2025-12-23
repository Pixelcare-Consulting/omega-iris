import { z } from 'zod'

export const BUSINESS_PARTNER_TYPE = ['Lead', 'Customer', 'Supplier'] as const

export const BUSINESS_PARTNER_TYPE_OPTIONS: { label: (typeof BUSINESS_PARTNER_TYPE)[number]; value: string }[] = [
  { label: 'Lead', value: 'L' },
  { label: 'Customer', value: 'C' },
  { label: 'Supplier', value: 'S' },
]

export const BUSINESS_PARTNER_TYPE_MAP: Record<string, (typeof BUSINESS_PARTNER_TYPE)[number]> = {
  L: 'Lead',
  C: 'Customer',
  S: 'Supplier',
}

export const BUSINESS_PARTNER_STD_API_VALUES_MAP: Record<string, string> = {
  L: 'cLid',
  C: 'cCustomer',
  S: 'cSupplier',
}

export const BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP: Record<string, string> = {
  L: 'bbpgt_CustomerGroup',
  C: 'bbpgt_CustomerGroup',
  S: 'bbpgt_VendorGroup',
}

export const businessPartnerFormSchema = z.object({
  code: z.coerce.number(),
  isActive: z.boolean(),
  syncStatus: z.string().nullish(),

  //* sap fields
  CardCode: z
    .string()
    .nullish()
    .transform((val) => {
      if (!val) return `BP-${Date.now()}`
      return val
    }),
  CardName: z.string().min(1, { message: 'Name is required' }),
  CardType: z.string().min(1, { message: 'Type is required' }),
  CntctPrsn: z.string().nullish(),
  CurrName: z.string().nullish(),
  CurrCode: z.string().nullish(),
  GroupCode: z.coerce.number().nullish(),
  GroupName: z.string().nullish(),
  GroupNum: z.coerce.number().nullish(),
  PymntGroup: z.string().nullish(),
  Phone1: z.string().nullish(),
  ShipToDef: z.string().nullish(),
  BillToDef: z.string().nullish(),
  AcctType: z.string().nullish(),
  Balance: z.coerce.number().nullish(),
  ChecksBal: z.coerce.number().nullish(),
})

export const syncToSapFormSchema = z.object({
  bps: z.array(
    z.object({
      code: z.coerce.number(),
      CardCode: z.string().nullish(),
      CardName: z.string().nullish(),
      CardType: z.string().nullish(),
      GroupCode: z.coerce.number().nullish(),
      CurrCode: z.string().nullish(),
      GroupNum: z.coerce.number().nullish(),
      Phone1: z.string().nullish(),
      AcctType: z.string().nullish(),
      Balance: z.coerce.number().nullish(),
      ChecksBal: z.coerce.number().nullish(),
    })
  ),

  cardType: z.string(),
})

export const syncFromSapFormSchema = z.object({
  cardType: z.string(),
})

export type BusinessPartnerForm = z.infer<typeof businessPartnerFormSchema>
export type SyncToSapForm = z.infer<typeof syncToSapFormSchema>
