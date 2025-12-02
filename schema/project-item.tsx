import { z } from 'zod'

export const projectItemFormSchema = z.object({
  code: z.coerce.number(),
  itemCode: z.coerce.number().min(1, { message: 'Item is required' }),
  projectIndividualCode: z.coerce.number().min(1, { message: 'Project is required' }),
})

export type ProjectItemForm = z.infer<typeof projectItemFormSchema>
