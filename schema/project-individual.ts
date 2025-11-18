import { z } from 'zod'

export const projectIndividualFormSchema = z.object({
  code: z.coerce.number(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  groupCode: z.coerce.number().min(1, { message: 'Please select a project group' }),
  customers: z.array(z.coerce.number()).min(1, { message: 'Please select at least one customer' }),
  pics: z.array(z.coerce.number()),
})

export type ProjectIndividualForm = z.infer<typeof projectIndividualFormSchema>
