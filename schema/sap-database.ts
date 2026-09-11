import { z } from 'zod'

//* Zod Schema
export const chooseSapDatabaseFormSchema = z.object({
  dbCode: z.string().min(1, { message: 'Database is required' }),
})

//* Type
export type ChooseSapDatabaseForm = z.infer<typeof chooseSapDatabaseFormSchema>
