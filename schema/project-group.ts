import { z } from 'zod'

export const projectGroupFormSchema = z.object({
  code: z.coerce.number(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  isActive: z.boolean(),
  pics: z.array(z.coerce.number()),
})

export const projectGroupPicFormSchema = z.object({
  code: z.coerce.number(),
  pics: z.array(z.coerce.number()),
})

export type ProjectGroupPicForm = z.infer<typeof projectGroupPicFormSchema>
export type ProjectGroupForm = z.infer<typeof projectGroupFormSchema>
