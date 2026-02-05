import { z } from 'zod'

const fileAttachmentErrorEntryFormSchema = z.object({
  message: z.string(),
})

const fileAttachmentErrorFormSchema = z.object({
  rowNumber: z.coerce.number(),
  fileName: z.string(),
  entries: z.array(fileAttachmentErrorEntryFormSchema),
  row: z.any().optional(),
})

export const uploadFileAttachmentFormSchema = z.object({
  refCode: z.coerce.number().nullish(),
  files: z.array(
    z.object({
      rowNumber: z.coerce.number(),
      formData: z.any(),
    })
  ),
  modulelName: z.string(),
  total: z.number(),
  stats: z.object({
    total: z.number(),
    completed: z.number(),
    progress: z.number(),
    errors: z.array(fileAttachmentErrorFormSchema),
    status: z.string(),
  }),
  isLast: z.boolean(),
})

export const fileAttachmentFormSchema = z.object({
  files: z.array(z.any()),
})

export type FileAttachmentForm = z.infer<typeof fileAttachmentFormSchema>
export type UploadFileAttachmentForm = z.infer<typeof uploadFileAttachmentFormSchema>
