import { z } from 'zod'

const rolePermissionsFormSchema = z.object({
  id: z.string().min(1, { message: 'Id is required' }),
  actions: z.array(z.string()),
})

export const roleFormSchema = z.object({
  code: z.coerce.number(),
  key: z.string(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  permissions: z.array(rolePermissionsFormSchema),
})

export type RoleForm = z.infer<typeof roleFormSchema>
