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

export const BUSINESS_PARTNER_TYPE_OF_BUSINESS_MAP: Record<string, string> = {
  C: 'Company',
  P: 'Private',
  G: 'Government',
  E: 'Employee',
}

export const ADDRESS_TYPE_MAP: Record<string, string> = {
  B: 'Billing',
  S: 'Shipping',
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

export const ADDRESS_TYPE_STD_API_MAP: Record<string, string> = {
  B: 'bo_BillTo',
  S: 'bo_ShipTo',
}

export const bpAddressFormSchema = z.object({
  id: z.string(),
  CardCode: z.string().nullish(),
  AddressName: z.string().min(1, { message: 'Address Name is required' }),
  AddrType: z.string().min(1, { message: 'Type is required' }),
  Street: z.string().nullish(),
  Address2: z.string().nullish(),
  Address3: z.string().nullish(),
  Block: z.string().nullish(),
  City: z.string().nullish(),
  ZipCode: z.string().nullish(),
  County: z.string().nullish(),
  CountryCode: z.string().nullish(),
  CountryName: z.string().nullish(),
  StateCode: z.string().nullish(),
  StateName: z.string().nullish(),
  StreetNo: z.string().nullish(),
  BuildingFloorRoom: z.string().nullish(),
  GlobalLocationNumber: z.string().nullish(),
})

export const bpAddressesFormSchema = z.array(bpAddressFormSchema).default([])

export const bpContactFormSchema = z.object({
  id: z.string(),
  CardCode: z.string().nullish(),
  ContactName: z.string().min(1, { message: 'Contact Name is required' }),
  FirstName: z.string().nullish(),
  LastName: z.string().nullish(),
  Title: z.string().nullish(),
  Position: z.string().nullish(),
  Phone1: z.string().nullish(),
  Phone2: z.string().nullish(),
  MobilePhone: z.string().nullish(),
  Email: z.union([z.string().email().nullish(), z.literal('')]),
})

export const bpContactsFormSchema = z.array(bpContactFormSchema).default([])

export const businessPartnerFormSchema = z.object({
  code: z.coerce.number(),
  isActive: z.boolean(),
  syncStatus: z.string().nullish(),

  //* sap fields
  CardCode: z.string().min(1, { message: 'Code is required' }),
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
  CmpPrivate: z.string().nullish(),
  contacts: z.array(bpContactFormSchema).default([]),
  billingAddresses: bpAddressesFormSchema,
  shippingAddresses: bpAddressesFormSchema,
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
      CmpPrivate: z.string().nullish(),
    })
  ),

  cardType: z.string(),
})

export const syncFromSapFormSchema = z.object({
  cardType: z.string(),
})

export type AddressForm = z.infer<typeof bpAddressFormSchema>
export type ContactForm = z.infer<typeof bpContactFormSchema>
export type BusinessPartnerForm = z.infer<typeof businessPartnerFormSchema>
export type SyncToSapForm = z.infer<typeof syncToSapFormSchema>
