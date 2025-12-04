'use client'

import ReadOnlyField from '@/components/read-only-field'
import { useUserById } from '@/hooks/safe-actions/user'
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
  const createdByValue = useUserById(createdBy)
  const updatedByValue = useUserById(updatedBy)
  const deletedByValue = useUserById(deletedBy)

  const renderValue = (value: ReturnType<typeof useUserById>) => {
    if (value.isLoading) return ''
    return `${value.data?.fname || ''}${value.data?.lname ? ` ${value.data?.lname}` : ''}`
  }

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
        value={renderValue(createdByValue)}
        isLoading={createdByValue.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Updated By'
        value={renderValue(updatedByValue)}
        isLoading={updatedByValue.isLoading}
      />

      <ReadOnlyField
        className='col-span-12 md:col-span-6 lg:col-span-4'
        title='Deleted By'
        value={renderValue(deletedByValue)}
        isLoading={deletedByValue.isLoading}
      />
    </>
  )
}
