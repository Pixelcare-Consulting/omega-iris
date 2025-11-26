'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
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

const MAXIMUM_SECONDS = 10
const MAXIMUM_COUNTDOWN = 5

export default function SigninForm() {
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [seconds, setSeconds] = useState(MAXIMUM_SECONDS)
  const [countdown, setCountdown] = useState(MAXIMUM_COUNTDOWN)

  const intervalRef = useRef<any>(null)
  const countdownRef = useRef<any>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [sapConnectionStatus, setSapConnectionStatus] = useState<string | undefined>()
  const [sapErrorMessage, setSapErrorMessage] = useState<string | undefined>()
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
    setIsLoading(true)
    setIsOpen(true)

    try {
      const response = await executeAsync(formValues)
      const result = response?.data

      if (result && !result.error) {
        const { redirectUrl, sapConnection } = result

        setSapConnectionStatus(sapConnection?.sapConnectionStatus)
        setSapErrorMessage(sapConnection?.sapErrorMessage)
        setRedirectUrl(redirectUrl)

        setIsLoading(false)
        setSeconds(0)

        return
      }

      if (result && result.error) {
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
      else if (seconds >= 2 && seconds <= 4) message = 'Authenticating SAP credentials...'
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

    if (countdown === 0 && redirectUrl) {
      clearInterval(countdownRef.current!)
      countdownRef.current = null

      window.location.assign(redirectUrl)
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

      <Popup
        visible={isOpen}
        dragEnabled={false}
        showCloseButton={false}
        showTitle={false}
        height={isLoading ? 250 : error || sapConnectionStatus === 'connected' ? 240 : 310}
        maxWidth={600}
      >
        <div className='pt-4'>
          <h2 className='mb-1.5 text-center text-lg font-semibold'>Authenticating</h2>
          {isLoading && <p className='mb-7 text-center text-sm text-slate-400'>Please wait while we authenticate you...</p>}

          {error && (
            <Alert variant='error' isHideIcon>
              <div>
                <h1 className='text-center text-sm font-bold'>Authentication Error</h1>
                <p className='mt-1 text-center text-sm'>{error}</p>
                <p className='mt-2 text-center text-xs'>An error occurred while authenticating. Please try again later.</p>
              </div>
            </Alert>
          )}

          {sapConnectionStatus === 'failed' && (
            <Alert variant='warning' isHideIcon>
              <div>
                <h1 className='text-center text-sm font-bold'>SAP Service Layer Connection Issue</h1>
                <p className='mt-1 text-center text-sm'>{sapErrorMessage}</p>
                <p className='mt-2 text-center text-xs'>
                  You can still access the application, but SAP-related features may be limited. You will now be redirected to your
                  dashboard in a {countdown}s...
                </p>
              </div>
            </Alert>
          )}

          {sapConnectionStatus === 'connected' && (
            <Alert variant='success' isHideIcon>
              <div>
                <h1 className='text-center text-sm font-bold'>Welcome Back!</h1>
                <p className='mt-1 text-center text-sm'>You will now be redirected to your dashboard in a {countdown}s...</p>
                <p className='mt-2 text-center text-xs'>You are now authenticated with SAP Service Layer</p>
              </div>
            </Alert>
          )}

          {seconds !== 0 && (
            <ProgressBar
              className='mx-auto my-4 [&_.dx-progressbar-status]:inline-block [&_.dx-progressbar-status]:w-full [&_.dx-progressbar-status]:text-center'
              width='90%'
              min={0}
              max={MAXIMUM_SECONDS}
              statusFormat={statusFormat}
              value={MAXIMUM_SECONDS - seconds}
            />
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
    </div>
  )
}
