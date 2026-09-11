import React from 'react'
import { SessionProvider } from 'next-auth/react'

import { auth } from '@/auth'
import { getSapDatabasesByRoleCode } from '@/actions/sap-database'
import AuthBrandHeader from '../_components/auth-brand-header'
import ChooseDatabaseForm from './_components/choose-database-form'

export default async function ChooseDatabasePage() {
  const session = await auth()
  const sapDatabases = await getSapDatabasesByRoleCode(session?.user?.roleCode)

  return (
    <div className='flex min-h-svh items-center justify-center bg-primary-black/5'>
      <div className='flex w-full max-w-lg flex-col gap-7 rounded-md bg-white px-10 py-14 shadow-md'>
        <AuthBrandHeader />

        <div className='flex flex-col items-center gap-1.5 text-center'>
          <h1 className='text-3xl font-bold tracking-tight text-primary sm:text-4xl'>Choose Company</h1>
          <p className='text-balance text-sm text-slate-500'>Select the company company you&apos;ll work in for this session.</p>
        </div>

        <SessionProvider session={session}>
          <ChooseDatabaseForm sapDatabases={sapDatabases} />
        </SessionProvider>
      </div>
    </div>
  )
}
