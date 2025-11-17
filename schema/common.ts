import { z } from 'zod'

export const paramsSchema = z.object({
  code: z.number().min(1, { message: 'Please enter an code.' }),
})

export type Params = z.infer<typeof paramsSchema>
