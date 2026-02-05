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
import { titleCase } from '@/utils'

type SupplierOverviewTabProps = {
  supplier: NonNullable<Awaited<ReturnType<typeof getBpByCode>>>
}

export default function SupplierOverviewTab({ supplier }: SupplierOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Supplier overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={supplier.code}>
          <Copy value={supplier.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Code' value={supplier.CardCode}>
          <Copy value={supplier.CardCode} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Name' value={supplier?.CardName || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Type'
          value={BUSINESS_PARTNER_TYPE_MAP?.[supplier.CardType] || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Code' value={supplier?.GroupCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Name' value={supplier?.GroupName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Account Type' value={supplier?.AcctType || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Type of Business'
          value={BUSINESS_PARTNER_TYPE_OF_BUSINESS_MAP[supplier?.CmpPrivate || ''] || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Currency Code' value={supplier?.CurrCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Currency Name' value={supplier?.CurrName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Payment Term Code' value={supplier?.GroupNum || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Payment Term Name' value={supplier?.PymntGroup || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={supplier?.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Sync Status'
          value={supplier?.syncStatus ? titleCase(supplier?.syncStatus) : ''}
        />

        <Separator className='col-span-12' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Phone 1' value={supplier?.Phone1 || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Inventory item record meta data' />

        <RecordMetaData
          createdAt={supplier.createdAt}
          updatedAt={supplier.updatedAt}
          deletedAt={supplier.deletedAt}
          createdBy={supplier.createdBy}
          updatedBy={supplier.updatedBy}
          deletedBy={supplier.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
