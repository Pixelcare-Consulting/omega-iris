import { z } from 'zod'

export const signinFormSchema = z.object({
  email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Email is invalid' }),
  password: z.string().min(1, { message: 'Password is required' }),
  callbackUrl: z.string().nullish(),
})

export type SigninForm = z.infer<typeof signinFormSchema>
