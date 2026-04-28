'use client'

import { useSearchParams } from 'next/navigation'
import { useForm, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { changePassword } from '@/actions/users'
import { ChangePasswordForm, changePasswordFormSchema, DEFAULT_USER_PASSWORD } from '@/schema/user'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { isEmpty } from 'radash'
import { signOut, useSession } from 'next-auth/react'

export default function ResetPasswordForm() {
  const { data: session } = useSession()

  const searchParams = useSearchParams()
  const isForceToChangePassword = searchParams.get('isForceToChangePassword')

  const form = useForm({
    mode: 'onChange',
    values: {
      code: session?.user.code || -1,
      oldPassword: DEFAULT_USER_PASSWORD,
      newPassword: '',
      newConfirmPassword: '',
      isForceToChangePassword: isForceToChangePassword === 'true',
      defaultPassword: DEFAULT_USER_PASSWORD,
    },
    resolver: zodResolver(changePasswordFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(changePassword)
  const formState = useFormState({ control: form.control })

  const handleOnSubmit = async (formData: ChangePasswordForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 409) form.setError('oldPassword', { type: 'custom', message: result.message })

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.user && 'id' in result?.data?.user) {
        await signOut({ redirect: false })

        setTimeout(() => {
          form.clearErrors()
        }, 500)

        setTimeout(() => {
          window.location.assign('/signin')
        }, 1000)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  if (!session || !session.user) return null

  return (
    <form className='grid grid-cols-12 gap-5 px-6 py-8' onSubmit={form.handleSubmit(handleOnSubmit)}>
      <div className='col-span-12'>
        <TextBoxField
          control={form.control}
          name='newPassword'
          label='New Password'
          isRequired
          extendedProps={{ textBoxOptions: { mode: 'password' } }}
        />
      </div>

      <div className='col-span-12'>
        <TextBoxField
          control={form.control}
          name='newConfirmPassword'
          label='New Confirm Password'
          isRequired
          extendedProps={{ textBoxOptions: { mode: 'password' } }}
        />
      </div>

      <LoadingButton
        className='col-span-12'
        text='Change Password'
        type='default'
        stylingMode='contained'
        useSubmitBehavior
        icon='refresh'
        isLoading={isExecuting}
        disabled={isEmpty(formState.dirtyFields)}
      />
    </form>
  )
}
