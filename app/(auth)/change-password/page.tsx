import React from 'react'

import { auth } from '@/auth'
import ResetPasswordForm from './_components/change-password-form'
import { SessionProvider } from 'next-auth/react'

export default async function ChangePasswordPage() {
  const session = await auth()

  return (
    <div className='flex min-h-svh items-center justify-center bg-primary-black/5'>
      <div className='flex flex-col gap-7 rounded-md bg-white px-10 py-14 shadow-md'>
        <div className='flex flex-col items-center gap-1.5 text-center'>
          <h1 className='text-3xl font-bold tracking-tight text-red-500 sm:text-4xl'>Change Password</h1>
          <p className='text-balance text-sm text-slate-500'>Change a strong password to protect your account.</p>
        </div>

        <SessionProvider session={session}>
          <ResetPasswordForm />
        </SessionProvider>
      </div>
    </div>
  )
}
