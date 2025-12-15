import { z } from 'zod'

export const projectItemFormSchema = z.object({
  code: z.coerce.number(),
  itemCode: z.coerce.number().min(1, { message: 'Item is required' }),
  projectIndividualCode: z.coerce.number().min(1, { message: 'Project is required' }),
  warehouseCode: z.coerce.number().nullish(),
  partNumber: z.string().nullish(),
  dateCode: z.string().nullish(),
  countryOfOrigin: z.string().nullish(),
  lotCode: z.string().nullish(),
  palletNo: z.string().nullish(),
  packagingType: z.string().nullish(),
  spq: z.string().nullish(),
  cost: z.coerce.number(),
  availableToOrder: z.coerce.number(),
  inProcess: z.coerce.number(),
  totalStock: z.coerce.number(),
  dateReceived: z.coerce.date().nullish(),
  dateReceivedBy: z.coerce.number().nullish(),
  siteLocation: z.string().nullish(),
  subLocation2: z.string().nullish(),
  subLocation3: z.string().nullish(),
  notes: z.string().nullish(),
})

export type ProjectItemForm = z.infer<typeof projectItemFormSchema>
