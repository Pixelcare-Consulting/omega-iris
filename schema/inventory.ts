import { z } from 'zod'

export const PALLET_SIZES = ['STANDARD', 'OVERSIZE', 'CRATES'] as const
export const PALLET_SIZE_VALUES: { label: string; value: string }[] = [
  {
    label: 'Standard',
    value: 'Standard',
  },
  {
    label: 'Oversize',
    value: 'Oversize',
  },
  {
    label: 'Crates',
    value: 'Crates',
  },
]

export const warehouseInventoryFormSchema = z
  .array(
    z.object({
      code: z.coerce.number().min(1, { message: 'Warehouse code is required' }),
      name: z.string(),
      isLocked: z.boolean(),
      inStock: z.coerce.number(),
      committed: z.coerce.number(),
      ordered: z.coerce.number(),
      available: z.coerce.number(),
    })
  )
  .default([])

export const inventoryFormSchema = z.object({
  code: z.coerce.number(),
  userCode: z.coerce.number().nullish(),
  projectIndividualCode: z.coerce.number().nullish(),
  thumbnail: z.string().nullish(),
  partNumber: z.string().nullish(),
  manufacturer: z.string().nullish(),
  manufacturerPartNumber: z.string().min(1, { message: 'MFG P/N is required' }),
  description: z.string().nullish(),
  dateCode: z.string().nullish(),
  lotCode: z.string().nullish(),
  siteLocation: z.string().nullish(),
  subLocation1: z.string().nullish(),
  subLocation2: z.string().nullish(),
  subLocation3: z.string().nullish(),
  subLocation4: z.string().nullish(),
  packagingType: z.string().nullish(),
  spq: z.string().nullish(),
  countryOfOrigin: z.string().nullish(),
  notes: z.string().nullish(),
  palletSize: z.string().nullish(),
  palletNo: z.string().nullish(),
  isActive: z.boolean(),
  dateReceived: z.coerce.date().nullish(),
  warehouseInventory: warehouseInventoryFormSchema,
})

export type InventoryForm = z.infer<typeof inventoryFormSchema>
