'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { Popup, ToolbarItem } from 'devextreme-react/popup'
import Button from 'devextreme-react/button'
import { ProgressBar } from 'devextreme-react/progress-bar'

import Alert from '@/components/alert'
import { signInUser } from '@/actions/auth'
import { type SigninForm, signinFormSchema } from '@/schema/auth'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { DEFAULT_SIGNIN_REDIRECT } from '@/constants/route'

const MAXIMUM_SECONDS = 10
const MAXIMUM_COUNTDOWN = 5

export default function SigninForm() {
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [seconds, setSeconds] = useState(MAXIMUM_SECONDS)
  const [countdown, setCountdown] = useState(MAXIMUM_COUNTDOWN)

  const [showReminder, setShowReminder] = useState(true)

  const intervalRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string | undefined>()

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const form = useForm<SigninForm>({
    mode: 'onChange',
    defaultValues: { email: '', password: '', callbackUrl },
    resolver: zodResolver(signinFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(signInUser)

  const handleSubmit = async (formValues: SigninForm) => {
    setError(undefined)
    setIsLoading(true)
    setIsOpen(true)
    setSeconds(MAXIMUM_SECONDS)
    setCountdown(MAXIMUM_COUNTDOWN)

    try {
      const response = await executeAsync(formValues)
      const result = response?.data

      if (result && !result.error) {
        const { redirectUrl, role } = result

        if (role && role.key === 'business-partner') {
          window.location.assign(DEFAULT_SIGNIN_REDIRECT)
          return
        }

        setRedirectUrl(redirectUrl)

        setIsLoading(false)
        setSeconds(0)
        setError(undefined)

        return
      }

      if (result && result.error) {
        setRedirectUrl(undefined)

        setError(result.message)
        setIsLoading(false)
        setSeconds(0)
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong! Please try again later.')
    }
  }

  const statusFormat = useCallback(
    (ratio: number) => {
      let message = ''
      const percent = `${ratio * 100}%`

      if (seconds >= 8 && seconds <= 10) message = 'Authenticating your credentials...'
      else if (seconds >= 5 && seconds <= 7) message = 'Checking your status...'
      else if (seconds >= 2 && seconds <= 4) message = 'Preparing your workspace...'
      else if (seconds === 1) message = 'Finalizing...'

      return `[${percent}]: ${message}`
    },
    [seconds]
  )

  useEffect(() => {
    if (isLoading && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev !== 1) return prev - 1
          return prev
        })
      }, 1000)
    }

    if (seconds === 0) {
      clearInterval(intervalRef.current!)
      intervalRef.current = null
    }
  }, [seconds, isLoading])

  useEffect(() => {
    if (!isLoading && seconds === 0 && !countdownRef.current) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }

    if (countdown === 0) {
      clearInterval(countdownRef.current!)
      countdownRef.current = null

      if (redirectUrl) window.location.assign(redirectUrl)
    }
  }, [countdown, isLoading, redirectUrl])

  return (
    <div className='flex flex-col gap-7 rounded-md px-10 py-14 shadow-md'>
      <div className='flex flex-col items-center gap-1.5 text-center'>
        <h1 className='bg-gradient-to-r from-red-500 to-red-800/80 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl'>
          Welcome Back!
        </h1>
        <p className='text-balance text-sm text-slate-500'>Enter your credentials to access your account</p>
      </div>

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
            isLoading={isLoading || isExecuting}
            loadingText='Signing in'
          />
        </form>
      </FormProvider>

      {/* //TODO: change database term as location -> change database name - instead of using dbCode using meaning name istead e.g. (US Company, PH Company etc) */}

      <Popup visible={isOpen} dragEnabled={false} showCloseButton={false} showTitle={false} height='auto' maxWidth={460}>
        <div className='px-2 py-4'>
          {isLoading && (
            <>
              <h2 className='text-center text-lg font-semibold'>Signing you in</h2>
              <p className='mt-1 text-center text-sm text-slate-500'>This only takes a moment.</p>

              <ProgressBar
                className='mx-auto mt-6 [&_.dx-progressbar-status]:inline-block [&_.dx-progressbar-status]:w-full [&_.dx-progressbar-status]:text-center'
                width='90%'
                min={0}
                max={MAXIMUM_SECONDS}
                statusFormat={statusFormat}
                value={MAXIMUM_SECONDS - seconds}
              />
            </>
          )}

          {!isLoading && error && (
            <Alert variant='error'>
              <p className='font-semibold'>We couldn&apos;t sign you in</p>
              <p className='mt-0.5 font-normal'>{error}</p>
            </Alert>
          )}

          {!isLoading && !error && redirectUrl && (
            <Alert variant='success'>
              <p className='font-semibold'>You&apos;re signed in successfully</p>
              <p className='mt-0.5 font-normal'>Taking you to your dashboard in {countdown}s.</p>
            </Alert>
          )}
        </div>

        <ToolbarItem visible={!isLoading && error === undefined} toolbar='bottom' widget='dxButton' location='center' locateInMenu='never'>
          <Button
            text='Go to Dashboard'
            type='default'
            stylingMode='contained'
            onClick={() => redirectUrl && window.location.assign(redirectUrl)}
          />
        </ToolbarItem>

        <ToolbarItem visible={!!error} toolbar='bottom' widget='dxButton' location='center' locateInMenu='never'>
          <Button text='Try Again' type='default' stylingMode='contained' onClick={() => setIsOpen(false)} />
        </ToolbarItem>
      </Popup>

      <Popup visible={showReminder} dragEnabled={false} showCloseButton={false} showTitle={false} height={415} maxWidth={645}>
        <div className='pt-4'>
          <h2 className='mb-1.5 text-center text-lg font-semibold'>Welcome to the New IRIS Portal</h2>

          <p className='mb-3 text-sm'>Hello Dear User/Customer we are currently migrating to a new and reimagined IRIS Portal.</p>

          <p className='mb-3 text-sm'>
            To access our old portal kindly use this link:{' '}
            <a className='!text-blue-500 hover:underline' href='https://iris.omegagti.com' target='_self' rel='noreferrer'>
              https://iris.omegagti.com
            </a>{' '}
          </p>

          <p className='mb-3 text-sm'>
            Starting <b>April 27, 2026 (8:00 AM PST)</b>, your existing project inventories will be transferred to this new portal where you
            can place your new work orders. You can still access our old portal for viewing previous work orders.
          </p>

          <p className='mb-3 text-sm'>
            Rest assured, your inventory and projects will still be safely maintained with us! Kindly contact your account manager to begin
            your migration to our new IRIS Portal.
          </p>

          <p className='mb-3 text-sm'>You may use the new credentials provided to you here.</p>

          <p>Thank you!</p>
          <p className='font-bold'>-Omega GTI</p>

          <ToolbarItem toolbar='bottom' widget='dxButton' location='center' locateInMenu='never'>
            <Button text='Got It!' type='default' stylingMode='contained' onClick={() => setShowReminder(false)} />
          </ToolbarItem>
        </div>
      </Popup>
    </div>
  )
}
