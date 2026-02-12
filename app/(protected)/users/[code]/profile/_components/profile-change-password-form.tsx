'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'nextjs-toploader/app'
import { toast } from 'sonner'

import { changePassword, getUserByCode } from '@/actions/users'
import { ChangePasswordForm, changePasswordFormSchema } from '@/schema/user'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { isEmpty } from 'radash'

type ProfileChangePasswordFormProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ProfileChangePasswordForm({ user }: ProfileChangePasswordFormProps) {
  const router = useRouter()

  const form = useForm({
    mode: 'onChange',
    values: {
      code: user.code,
      oldPassword: '',
      newPassword: '',
      newConfirmPassword: '',
    },
    resolver: zodResolver(changePasswordFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(changePassword)
  const formState = useFormState({ control: form.control })

  const oldPassword = useWatch({ control: form.control, name: 'oldPassword' })

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
        router.refresh()

        setTimeout(() => {
          router.push(`/users/${result.data.user.code}/profile`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleCancel = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  //* clear password fields when old password is empty
  useEffect(() => {
    if (!oldPassword) {
      form.setValue('newPassword', '')
      form.setValue('newConfirmPassword', '')
      form.clearErrors(['newPassword', 'newConfirmPassword'])
    }
  }, [oldPassword])

  return (
    <FormProvider {...form}>
      <form className='mt-5 rounded-md bg-white shadow-md' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <header className='flex items-center justify-between border-b px-4 py-3'>
          <h1 className='text-lg font-bold tracking-tight'>Change Password</h1>

          <div className='col-span-12 flex items-center justify-end gap-2'>
            <LoadingButton
              text='Cancel'
              type='normal'
              stylingMode='contained'
              isLoading={isExecuting}
              disabled={isEmpty(formState.dirtyFields)}
              onClick={handleCancel}
            />

            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={isEmpty(formState.dirtyFields)}
            />
          </div>
        </header>

        <div className='grid grid-cols-12 gap-5 px-6 py-8'>
          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField
              control={form.control}
              name='oldPassword'
              label='Old Password'
              isRequired
              extendedProps={{ textBoxOptions: { mode: 'password' } }}
            />
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField
              control={form.control}
              name='newPassword'
              label='New Password'
              isRequired
              extendedProps={{ textBoxOptions: { mode: 'password' } }}
            />
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField
              control={form.control}
              name='newConfirmPassword'
              label='New Confirm Password'
              isRequired
              extendedProps={{ textBoxOptions: { mode: 'password' } }}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
