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
  userCode: z.coerce.number().min(1, { message: 'Please select a customer' }),
  projectIndividualCode: z.coerce.number().min(1, { message: 'Please select a project' }),
  thumbnail: z.string().nullish(),
  partNumber: z.string().min(1, { message: 'Part number is required' }),
  manufacturer: z.string().min(1, { message: 'Manufacturer is required' }),
  manufacturerPartNumber: z.string().min(1, { message: 'MFG P/N is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  dateCode: z.string().nullish(),
  lotCode: z.string().nullish(),
  siteLocation: z.string().nullish(),
  subLocation1: z.string().nullish(),
  subLocation2: z.string().nullish(),
  subLocation3: z.string().nullish(),
  subLocation4: z.string().nullish(),
  packagingType: z.string().nullish(),
  spq: z.string().nullish(),
  cost: z.coerce.number().min(1, { message: 'Cost is required' }),
  countryOfOrigin: z.string().nullish(),
  note: z.string().nullish(),
  palletSize: z.string().nullish(),
  palletNo: z.string().nullish(),
  isActive: z.boolean(),
  dateReceived: z.coerce.date().nullish(),
  inProcess: z.coerce.number().nullish(),
  warehouseInventory: warehouseInventoryFormSchema,
})

export type InventoryForm = z.infer<typeof inventoryFormSchema>
