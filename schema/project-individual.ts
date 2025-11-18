import { z } from 'zod'

export const projectIndividualFormSchema = z.object({
  code: z.coerce.number(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().nullish(),
  isActive: z.boolean(),
  groupCode: z.coerce.number().min(1, { message: 'Please select a project group' }),
  customers: z.array(z.coerce.number()).min(1, { message: 'Please select at least one customer' }),
  pics: z.array(z.coerce.number()),
})

export const projectIndividualCustomerFormSchema = z.object({
  code: z.coerce.number(),
  customers: z.array(z.coerce.number()).min(1, { message: 'Please select at least one customer' }),
})

export const projectIndividualPicFormSchema = z.object({
  code: z.coerce.number(),
  pics: z.array(z.coerce.number()).min(1, { message: 'Please select at least one P.I.C' }),
})

export type ProjectIndividualCustomerForm = z.infer<typeof projectIndividualCustomerFormSchema>
export type ProjectIndividualPicForm = z.infer<typeof projectIndividualPicFormSchema>
export type ProjectIndividualForm = z.infer<typeof projectIndividualFormSchema>
