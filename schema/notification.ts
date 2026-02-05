import { z } from 'zod'

export const notificationFormSchema = z.object({
  title: z.string(),
  message: z.string(),
  link: z.string().nullish(),
  entityType: z.string().nullish(),
  entityCode: z.coerce.number().nullish(),
  entityId: z.coerce.string().nullish(),
  metaData: z.any().nullish(),
  userCodes: z.array(z.coerce.number()),
  isGlobal: z.boolean().optional(),
  isInternal: z.boolean().optional(),
  permissionCode: z.string(),
})

export type NotificationForm = z.infer<typeof notificationFormSchema>
