'use client'

import ReadOnlyField from '@/components/read-only-field'
import useUserByIdClient from '@/hooks/safe-actions/use-user-byId-client'
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
  const createdByClient = useUserByIdClient(createdBy)
  const updatedByClient = useUserByIdClient(updatedBy)
  const deletedByClient = useUserByIdClient(deletedBy)

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
        value={createdByClient.data ? `${createdByClient.data.fname} ${createdByClient.data.lname}` : ''}
        isLoading={createdByClient.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Updated By'
        value={updatedByClient.data ? `${updatedByClient.data.fname} ${updatedByClient.data.lname}` : ''}
        isLoading={updatedByClient.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Deleted By'
        value={deletedByClient.data ? `${deletedByClient.data.fname} ${deletedByClient.data.lname}` : ''}
        isLoading={deletedByClient.isLoading}
      />
    </>
  )
}
