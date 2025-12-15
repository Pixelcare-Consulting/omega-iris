import { z } from 'zod'

export const itemWarehouseInventoryFormSchema = z
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

export const itemFormSchema = z.object({
  code: z.coerce.number(),
  manufacturerPartNumber: z.string().min(1, { message: 'MFG P/N is required' }),
  manufacturer: z.string().nullish(),
  description: z.string().nullish(),
  thumbnail: z.string().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean(),

  //* warehouse inventory
  // warehouseInventory: itemWarehouseInventoryFormSchema,

  //* sap fields
  ItemCode: z.string().nullish(),
  ItemName: z.string().nullish(),
  ItmsGrpCod: z.coerce.number().nullish(),
  FirmCode: z.coerce.number().nullish(),
  Price: z.coerce.number().nullish(),
})

export type ItemForm = z.infer<typeof itemFormSchema>
