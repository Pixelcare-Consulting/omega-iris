'use client'

import ReadOnlyField from '@/components/read-only-field'
import { useUserByIdClient } from '@/hooks/safe-actions/user'
import { format, isValid } from 'date-fns'

type RecordMetaDataProps = {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  createdBy?: string | null
  updatedBy?: string | null
  deletedBy?: string | null
}

export default function RecordMetaData({ createdAt, updatedAt, deletedAt, createdBy, updatedBy, deletedBy }: RecordMetaDataProps) {
  const createdByValue = useUserByIdClient(createdBy)
  const updatedByValue = useUserByIdClient(updatedBy)
  const deletedByValue = useUserByIdClient(deletedBy)

  return (
    <>
      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Create At'
        value={format(createdAt, 'MM-dd-yyyy hh:mm a')}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Updated At'
        value={format(updatedAt, 'MM-dd-yyyy hh:mm a')}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Deleted At'
        value={deletedAt && isValid(deletedAt) ? format(deletedAt, 'MM-dd-yyyy hh:mm a') : ''}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Created By'
        value={createdByValue.data ? `${createdByValue.data.fname} ${createdByValue.data.lname}` : ''}
        isLoading={createdByValue.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Updated By'
        value={updatedByValue.data ? `${updatedByValue.data.fname} ${updatedByValue.data.lname}` : ''}
        isLoading={updatedByValue.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Deleted By'
        value={deletedByValue.data ? `${deletedByValue.data.fname} ${deletedByValue.data.lname}` : ''}
        isLoading={deletedByValue.isLoading}
      />
    </>
  )
}
