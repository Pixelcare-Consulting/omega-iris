'use client'

import { format, isValid } from 'date-fns'
import ScrollView from 'devextreme-react/scroll-view'

import { getUserByCode } from '@/actions/users'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import Copy from '@/components/copy'
import { Badge } from '@/components/badge'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import { BUSINESS_PARTNER_ROLE_KEY } from '@/constants/role'
import { getCustomerCards } from '@/utils/user-bp-profile'
import { cn } from '@/utils'

type UserOverviewTabProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function UserOverviewTab({ user }: UserOverviewTabProps) {
  const customerCards = user.role.key === BUSINESS_PARTNER_ROLE_KEY ? getCustomerCards(user.bpProfiles) : []

  return (
    <ScrollView useNative>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='User overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={user.code}>
          <Copy value={user.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='First Name' value={user.fname} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Last Name' value={user.lname} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Username' value={user.username} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Email' value={user.username} />

        <ReadOnlyField
          className={cn('col-span-12 md:col-span-6', customerCards.length > 0 ? 'lg:col-span-6' : 'lg:col-span-3')}
          title='Role'
          value={
            //* same as the users list role column, one badge per company card
            <div className='flex flex-col items-start gap-1'>
              <span>{user.role.name}</span>
              {customerCards.map((card) => (
                <Badge key={card.dbCode} variant='soft-blue'>
                  {card.dbName} - {card.cardName} ({card.cardCode})
                </Badge>
              ))}
            </div>
          }
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Status' value={user.isActive ? 'Active' : 'Inactive'} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Force To change Password'
          value={user.isDefaultPasswordChanged ? 'No' : 'Yes'}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Locked' value={user.isLocked ? 'Yes' : 'No'} />

        <Separator className='col-span-12' orientation='horizontal' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Location' value={user?.location} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Last IP Address' value={user?.lastIpAddress || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Last Signin'
          value={user?.lastSignin && isValid(user?.lastSignin) ? format(user.lastSignin, 'MM-dd-yyyy hh:mm a') : ''}
        />

        <Separator className='col-span-12' />
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
