'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import type { SapDatabase } from '@prisma/client'

import { ChooseSapDatabaseForm, chooseSapDatabaseFormSchema } from '@/schema/sap-database'
import { useSapDatabase } from '@/hooks/use-sap-database'
import ReadOnlyField from '@/components/read-only-field'
import SelectBoxField from '@/components/forms/select-box-field'
import LoadingButton from '@/components/loading-button'

type ChooseDatabaseFormProps = { sapDatabases: SapDatabase[] }

export default function ChooseDatabaseForm({ sapDatabases }: ChooseDatabaseFormProps) {
  const { data: session } = useSession()
  const { sapDbCode, isSwitching, switchDatabase } = useSapDatabase()

  const form = useForm({
    mode: 'onChange',
    values: { dbCode: sapDbCode || '' },
    resolver: zodResolver(chooseSapDatabaseFormSchema),
  })

  const selectedDbCode = useWatch({ control: form.control, name: 'dbCode' })

  const handleOnSubmit = async ({ dbCode }: ChooseSapDatabaseForm) => {
    //* switchDatabase navigates on success
    const { isSwitched, message } = await switchDatabase(dbCode)

    if (!isSwitched) {
      toast.error(message)
      form.setError('dbCode', { type: 'custom', message: 'Could not connect to this database' })
    }
  }

  if (!session || !session.user) return null

  const fullName = [session.user.fname, session.user.lname].filter(Boolean).join(' ')

  return (
    <form className='grid grid-cols-12 gap-5 px-6 py-8' onSubmit={form.handleSubmit(handleOnSubmit)}>
      <ReadOnlyField className='col-span-12' title='Full Name' value={fullName} />

      <ReadOnlyField className='col-span-12' title='Email' value={session.user.email} />

      <div className='col-span-12 border-t border-slate-200' />

      {sapDatabases.length < 1 && (
        <p className='col-span-12 rounded-md bg-amber-50 px-4 py-3 text-center text-sm text-amber-700'>
          Your role has no company assigned. Please contact an administrator.
        </p>
      )}

      <div className='col-span-12'>
        <SelectBoxField
          data={sapDatabases}
          control={form.control}
          name='dbCode'
          label='Company'
          placeholder='Select a company'
          isRequired
          searchExpr={['name', 'dbCode']}
          displayExpr='name'
          valueExpr='dbCode'
        />
      </div>

      <LoadingButton
        className='col-span-12'
        text='Proceed'
        loadingText='Proceeding'
        type='default'
        stylingMode='contained'
        useSubmitBehavior
        icon='arrowright'
        isLoading={isSwitching}
        disabled={!selectedDbCode}
      />
    </form>
  )
}
