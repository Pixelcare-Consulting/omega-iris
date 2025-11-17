import { z } from 'zod'

export const roleFormSchema = z.object({
  code: z.coerce.number(),
  key: z.string(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
})

export type RoleForm = z.infer<typeof roleFormSchema>
