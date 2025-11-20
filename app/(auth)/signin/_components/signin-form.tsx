'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'

import Alert from '@/components/alert'
import { signInUser } from '@/actions/auth'
import { type SigninForm, signinFormSchema } from '@/schema/auth'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'

export default function SigninForm() {
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState<string | undefined>()

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const form = useForm<SigninForm>({
    mode: 'onChange',
    defaultValues: { email: '', password: '', callbackUrl },
    resolver: zodResolver(signinFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(signInUser)

  const handleSubmit = async (formValues: SigninForm) => {
    setError('')
    setSuccess('')

    try {
      const response = await executeAsync(formValues)
      const result = response?.data

      if (result && !result.error) {
        setSuccess('Successfully logged in!')
        form.reset()
        return
      }

      if (result && result.error) setError(result.message)
    } catch (err) {
      console.error(err)
      setError('Something went wrong! Please try again later.')
    }
  }

  return (
    <div className='flex flex-col gap-7 rounded-md px-10 py-14 shadow-md'>
      <div className='flex flex-col items-center gap-1.5 text-center'>
        <h1 className='bg-gradient-to-r from-red-500 to-red-800/80 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl'>
          Welcome Back!
        </h1>
        <p className='text-balance text-sm text-slate-500'>Enter your credentials to access your account</p>
      </div>

      <Alert variant='success' message={success} />
      <Alert variant='error' message={error} />

      <FormProvider {...form}>
        <form id='login-form' className='space-y-5' onSubmit={form.handleSubmit(handleSubmit)}>
          <TextBoxField control={form.control} name='email' label='Email' />
          <TextBoxField control={form.control} name='password' label='Password' extendedProps={{ textBoxOptions: { mode: 'password' } }} />

          <LoadingButton
            className='w-full'
            text='Sign in'
            type='default'
            stylingMode='contained'
            useSubmitBehavior
            icon='login'
            isLoading={isExecuting}
            loadingText='Signing in'
          />
        </form>
      </FormProvider>
    </div>
  )
}
