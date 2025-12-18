import { z } from 'zod'

const importSyncErrorEntryFormSchema = z.object({
  field: z.string(),
  message: z.string(),
})

const importSyncErrorFormSchema = z
  .object({
    rowNumber: z.number(),
    entries: z.array(importSyncErrorEntryFormSchema),
    row: z.any().optional(),
  })
  .catchall(z.any())

export const importFormSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
  total: z.number(),
  stats: z.object({
    total: z.number(),
    completed: z.number(),
    progress: z.number(),
    errors: z.array(importSyncErrorFormSchema),
    status: z.string(),
  }),
  isLastRow: z.boolean(),
  metaData: z.record(z.string(), z.any()).nullish(),
})

export type ImportForm = z.infer<typeof importFormSchema>
