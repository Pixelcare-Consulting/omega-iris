import { z } from 'zod'

export const pItemInventoryFormSchema = z
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

export const projectItemFormSchema = z.object({
  code: z.coerce.number(),
  itemCode: z.coerce.number().min(1, { message: 'Item is required' }),
  projectIndividualCode: z.coerce.number().min(1, { message: 'Project is required' }),
  isActive: z.boolean(),
  notes: z.string().nullish(),
  warehouseInventory: pItemInventoryFormSchema,
})

export type ProjectItemForm = z.infer<typeof projectItemFormSchema>
