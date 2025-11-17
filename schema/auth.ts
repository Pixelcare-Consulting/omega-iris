import { z } from 'zod'

export const signinFormSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  callbackUrl: z.string().nullish(),
})

export type SigninForm = z.infer<typeof signinFormSchema>
