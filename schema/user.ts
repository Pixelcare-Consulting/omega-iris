import { z } from 'zod'

//* Zod Schema
export const userFormSchema = z
  .object({
    code: z.coerce.number(),
    fname: z.string().min(1, { message: 'First name is required' }),
    lname: z.string().min(1, { message: 'Last name is required' }),
    username: z.string().min(1, { message: 'Username is required' }),
    email: z.string().email().min(1, { message: 'Email is required' }),
    password: z.string().nullish(),
    confirmPassword: z.string().nullish(),
    roleCode: z.coerce.number().min(1, { message: 'Role is required' }),
    roleKey: z.string().min(1, { message: 'Role key is required' }),
    isActive: z.boolean(),
    oldPassword: z.string().nullish(),
    newPassword: z.string().nullish(),
    newConfirmPassword: z.string().nullish(),
    customerCode: z.string().nullish(),
  })
  //TODO: Customer is not required for now, uncomment this when customer is required
  // .refine(
  //   (formObj) => {
  //     if (formObj.roleKey === 'customer') return formObj.customerCode && formObj.customerCode.length >= 1
  //     else return true
  //   },
  //   { message: 'Customer code is required', path: ['customerCode'] }
  // )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code === -1) {
        if (formObj.password && formObj.password !== null && formObj.password !== undefined) return formObj.password.length >= 8
      } else return true
    },
    { message: 'Password must be at least 8 characters', path: ['password'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code === -1) {
        if (formObj.confirmPassword && formObj.confirmPassword !== null && formObj.confirmPassword !== undefined)
          return formObj.confirmPassword.length >= 8
      } else return true
    },
    { message: 'Confirm password must be at least 8 characters', path: ['confirmPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code === -1) return formObj.password === formObj.confirmPassword
      else return true
    },
    { message: "Passwords don't match", path: ['confirmPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code !== -1) {
        if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
          return formObj.oldPassword.length >= 8
        }

        return true
      } else return true
    },
    { message: 'Old password must be at least 8 characters', path: ['oldPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code !== -1) {
        if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
          if (formObj.newPassword !== null && formObj.newPassword !== undefined) {
            return formObj.newPassword.length >= 8
          } else return true
        }

        return true
      } else return true
    },
    { message: 'New password must be at least 8 characters', path: ['newPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code !== -1) {
        if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
          if (formObj.newConfirmPassword !== null && formObj.newConfirmPassword !== undefined) {
            return formObj.newConfirmPassword.length >= 8
          } else return true
        }

        return true
      } else return true
    },
    { message: 'new confirm password must be at least 8 characters', path: ['newConfirmPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.code && formObj.code !== -1) {
        if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
          if (
            formObj.newPassword &&
            formObj.newPassword !== null &&
            formObj.newPassword !== undefined &&
            formObj.newConfirmPassword &&
            formObj.newConfirmPassword !== null &&
            formObj.newConfirmPassword !== undefined
          ) {
            return formObj.newPassword === formObj.newConfirmPassword
          } else return true
        }

        return true
      } else return true
    },
    { message: "New confirm passwords don't match", path: ['newConfirmPassword'] }
  )

export const basicInfoFormSchema = z.object({
  code: z.coerce.number(),
  fname: z.string().min(1, { message: 'First name is required' }),
  lname: z.string().min(1, { message: 'Last name is required' }),
  username: z.string().min(1, { message: 'Username is required' }),
  email: z.string().email().min(1, { message: 'Email is required' }),
  roleCode: z.coerce.number().min(1, { message: 'Role is required' }),
  roleKey: z.string().min(1, { message: 'Role key is required' }),
  isActive: z.boolean(),
  customerCode: z.string().nullish(),
})

export const changePasswordFormSchema = z
  .object({
    code: z.coerce.number(),
    oldPassword: z.string().min(8, { message: 'Old password must be at least 8 characters long' }).nullish(),
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters long' }).nullish(),
    newConfirmPassword: z.string().min(8, { message: 'New confirm password must be at least 8 characters long' }).nullish(),
  })
  .refine(
    (formObj) => {
      if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
        return formObj.oldPassword.length >= 8
      }

      return true
    },
    { message: 'Old password must be at least 8 characters', path: ['oldPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
        if (formObj.newPassword !== null && formObj.newPassword !== undefined) {
          return formObj.newPassword.length >= 8
        } else return true
      }

      return true
    },
    { message: 'New password must be at least 8 characters', path: ['newPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
        if (formObj.newConfirmPassword !== null && formObj.newConfirmPassword !== undefined) {
          return formObj.newConfirmPassword.length >= 8
        } else return true
      }

      return true
    },
    { message: 'new confirm password must be at least 8 characters', path: ['newConfirmPassword'] }
  )
  .refine(
    (formObj) => {
      if (formObj.oldPassword && formObj.oldPassword !== null && formObj.oldPassword !== undefined) {
        if (
          formObj.newPassword &&
          formObj.newPassword !== null &&
          formObj.newPassword !== undefined &&
          formObj.newConfirmPassword &&
          formObj.newConfirmPassword !== null &&
          formObj.newConfirmPassword !== undefined
        ) {
          return formObj.newPassword === formObj.newConfirmPassword
        } else return true
      }

      return true
    },
    { message: "New confirm passwords don't match", path: ['newConfirmPassword'] }
  )

export type UserForm = z.infer<typeof userFormSchema>
export type BasicInfoForm = z.infer<typeof basicInfoFormSchema>
export type ChangePasswordForm = z.infer<typeof changePasswordFormSchema>
