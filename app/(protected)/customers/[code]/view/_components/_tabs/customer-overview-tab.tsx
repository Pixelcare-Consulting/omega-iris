'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getBpByCode } from '@/actions/business-partner'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import Separator from '@/components/separator'
import { BUSINESS_PARTNER_TYPE_MAP, BUSINESS_PARTNER_TYPE_OF_BUSINESS_MAP } from '@/schema/business-partner'

type CustomerOverviewTabProps = {
  customer: NonNullable<Awaited<ReturnType<typeof getBpByCode>>>
}

export default function CustomerOverviewTab({ customer }: CustomerOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Customer overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={customer.code}>
          <Copy value={customer.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Code' value={customer.CardCode}>
          <Copy value={customer.CardCode} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Name' value={customer?.CardName || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Type'
          value={BUSINESS_PARTNER_TYPE_MAP?.[customer.CardType] || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Code' value={customer?.GroupCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Name' value={customer?.GroupName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Account Type' value={customer?.AcctType || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Type of Business'
          value={BUSINESS_PARTNER_TYPE_OF_BUSINESS_MAP[customer?.CmpPrivate || ''] || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Currency Code' value={customer?.CurrCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Currency Name' value={customer?.CurrName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Payment Term Code' value={customer?.GroupNum || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Payment Term Name' value={customer?.PymntGroup || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={customer?.isActive ? 'Active' : 'Inactive'}
        />

        <Separator className='col-span-12' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Phone 1' value={customer?.Phone1 || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Inventory item record meta data' />

        <RecordMetaData
          createdAt={customer.createdAt}
          updatedAt={customer.updatedAt}
          deletedAt={customer.deletedAt}
          createdBy={customer.createdBy}
          updatedBy={customer.updatedBy}
          deletedBy={customer.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
