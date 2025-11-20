'use client'

import { format, isValid } from 'date-fns'
import ScrollView from 'devextreme-react/scroll-view'

import { getUserByCode } from '@/actions/users'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'

type UserOverviewTabProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function UserOverviewTab({ user }: UserOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='User overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={user.code}>
          <Copy value={user.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='First Name' value={user.fname} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Last Name' value={user.lname} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Username' value={user.username} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Email' value={user.username} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Role' value={user.role.name} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Status' value={user.isActive ? 'Active' : 'Inactive'} />

        <Separator className='col-span-12' orientation='horizontal' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Location' value={user?.location} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Last IP Address' value={user?.lastIpAddress || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Last Signin'
          value={user?.lastSignin && isValid(user?.lastSignin) ? format(user.lastSignin, 'MM-dd-yyyy hh:mm a') : ''}
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Role record meta data' />

        <RecordMetaData
          createdAt={user.createdAt}
          updatedAt={user.updatedAt}
          deletedAt={user.deletedAt}
          createdBy={user.createdBy}
          updatedBy={user.updatedBy}
          deletedBy={user.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
