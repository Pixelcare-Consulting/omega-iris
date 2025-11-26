import { z } from 'zod'

export const warehouseFormSchema = z.object({
  code: z.coerce.number(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  isNettable: z.boolean(),
  isEnableBinLocations: z.boolean(),
  address1: z.string().nullish(),
  address2: z.string().nullish(),
  address3: z.string().nullish(),
  streetPoBox: z.string().nullish(),
  streetNo: z.string().nullish(),
  block: z.string().nullish(),
  buildingFloorRoom: z.string().nullish(),
  zipCode: z.string().nullish(),
  city: z.string().nullish(),
  countryRegion: z.string().nullish(),
  state: z.string().nullish(),
  county: z.string().nullish(),
  federalTaxId: z.string().nullish(),
  gln: z.string().nullish(),
  taxOffice: z.string().nullish(),
})

export type WarehouseForm = z.infer<typeof warehouseFormSchema>
