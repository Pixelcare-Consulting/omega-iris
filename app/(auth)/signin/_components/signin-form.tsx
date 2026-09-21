'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { Popup, ToolbarItem } from 'devextreme-react/popup'
import Button from 'devextreme-react/button'
import { ProgressBar } from 'devextreme-react/progress-bar'
import { PulseLoader } from 'react-spinners'

import Alert from '@/components/alert'
import { Icons } from '@/components/icons'
import { signInUser } from '@/actions/auth'
import { type SigninForm, signinFormSchema } from '@/schema/auth'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { DEFAULT_SIGNIN_REDIRECT } from '@/constants/route'
import { delay } from '@/utils'

const MAXIMUM_SECONDS = 10
const MAXIMUM_COUNTDOWN = 3

//* floor on the loading panel, a cached build signs in faster than the popup can be read
const MIN_LOADING_MS = 900

//* how long the filled bar stays up before the panel swaps
const SETTLE_MS = 450

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
      //* a fast signin would otherwise flash the popup before it can be read
      const [response] = await Promise.all([executeAsync(formValues), delay(MIN_LOADING_MS)])
      const result = response?.data

      if (result && !result.error) {
        const { redirectUrl, role } = result

        if (role && role.key === 'business-partner') {
          window.location.assign(DEFAULT_SIGNIN_REDIRECT)
          return
        }

        setRedirectUrl(redirectUrl)
        setError(undefined)

        //* fill the bar first, then swap the panel, so it lands instead of being yanked
        setSeconds(0)
        await delay(SETTLE_MS)

        setIsLoading(false)

        return
      }

      //! no fill to full here, a completed bar in front of an error reads as success
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

  //* the bar shows how far along we are, so the message sits under it instead of inside
  const statusMessage = useMemo(() => {
    if (seconds >= 8) return 'Authenticating your credentials'
    if (seconds >= 5) return 'Checking your status'
    if (seconds >= 2) return 'Preparing your workspace'
    return 'Almost there'
  }, [seconds])

  useEffect(() => {
    if (isLoading && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        //! hold at 1 while waiting — success sets seconds to 0, so the bar only completes when the request does
        setSeconds((prev) => (prev !== 1 ? prev - 1 : prev))
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

      <Popup visible={isOpen} dragEnabled={false} showCloseButton={false} showTitle={false} height='auto' maxWidth={520}>
        <div className='px-12 py-14'>
          {isLoading && (
            <div className='flex flex-col items-center text-center duration-300 animate-in fade-in zoom-in-95 motion-reduce:animate-none'>
              <PulseLoader color='#ed1c24' size={14} margin={6} />

              <h2 className='mt-9 text-2xl font-bold tracking-tight text-primary'>Signing you in</h2>
              <p className='mt-2.5 text-sm text-slate-500'>Checking your credentials and setting up your workspace.</p>

              {/* //* devextreme snaps between values, the transition makes the jump to full sweep instead */}
              <ProgressBar
                className='mt-9 w-full [&_.dx-progressbar-range]:transition-[width] [&_.dx-progressbar-range]:duration-500 [&_.dx-progressbar-range]:ease-out [&_.dx-progressbar-status]:hidden'
                min={0}
                max={MAXIMUM_SECONDS}
                value={MAXIMUM_SECONDS - seconds}
              />

              <p className='mt-3.5 text-sm text-slate-400'>{statusMessage}</p>
            </div>
          )}

          {!isLoading && error && (
            <div className='flex flex-col items-center text-center duration-300 animate-in fade-in zoom-in-95 motion-reduce:animate-none'>
              <h2 className='text-2xl font-bold tracking-tight text-primary'>We couldn&apos;t sign you in</h2>
              <p className='mt-2.5 text-sm text-slate-500'>Check the details below and try again.</p>

              <Alert className='mt-8 w-full text-left' variant='error'>
                {error}
              </Alert>
            </div>
          )}

          {!isLoading && !error && redirectUrl && (
            <div className='flex flex-col items-center text-center duration-300 animate-in fade-in zoom-in-95 motion-reduce:animate-none'>
              <span className='flex size-16 items-center justify-center rounded-full bg-green-500/15'>
                <Icons.check className='size-8 text-green-500' />
              </span>

              <h2 className='mt-8 text-2xl font-bold tracking-tight text-primary'>You&apos;re signed in</h2>
              <p className='mt-2.5 text-sm text-slate-500'>Taking you to your dashboard in {countdown}s.</p>
            </div>
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
