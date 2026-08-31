import { z } from 'zod'

export const itemFormSchema = z.object({
  code: z.coerce.number(),
  thumbnail: z.string().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean(),
  syncStatus: z.string().nullish(),

  //* sap fields
  ItemCode: z.string().min(1, { message: 'MFG P/N is required' }),
  ItemName: z.string().nullish(),
  ItmsGrpCod: z.coerce.number().nullish(),
  ItmsGrpNam: z.string().nullish(),
  FirmCode: z.coerce.number().nullish(),
  FirmName: z.string().nullish(),
  Price: z.coerce.number().nullish(),
})

export const syncToSapFormSchema = z.object({
  items: z.array(
    z.object({
      code: z.coerce.number(),
      ItemCode: z.string().nullish(),
      ItemName: z.string().nullish(),
      Manufacturer: z.coerce.number().nullish(),
      ItemsGroupCode: z.coerce.number().nullish(),
    })
  ),
})

export type ItemForm = z.infer<typeof itemFormSchema>
export type SyncToSapForm = z.infer<typeof syncToSapFormSchema>
