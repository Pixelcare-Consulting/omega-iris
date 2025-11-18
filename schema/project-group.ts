import { z } from 'zod'

export const projectGroupFormSchema = z.object({
  code: z.coerce.number(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  isActive: z.boolean(),
})

export type ProjectGroupForm = z.infer<typeof projectGroupFormSchema>
