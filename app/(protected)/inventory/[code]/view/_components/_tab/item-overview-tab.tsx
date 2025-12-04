'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getItemByCode } from '@/actions/item'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'

type ItemOverviewTabProps = {
  item: NonNullable<Awaited<ReturnType<typeof getItemByCode>>>
}

export default function ItemOverviewTab({ item }: ItemOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Inventory item overview information' />

        <ReadOnlyField
          className='col-span-12 lg:col-span-3'
          value={
            <img
              src={item.thumbnail || '/images/placeholder-img.jpg'}
              className='size-[280px] w-full rounded-2xl object-cover object-center'
            />
          }
        />

        <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
          <ReadOnlyField className='col-span-12' title='ID' value={item.code}>
            <Copy value={item.code} />
          </ReadOnlyField>

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer' value={item?.manufacturer || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='MFG P/N' value={item?.manufacturerPartNumber || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={item?.description || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Status' value={item?.isActive ? 'Active' : 'Inactive'} />

          <ReadOnlyField className='col-span-12' title='Notes' value={item?.notes || ''} />
        </div>

        <ReadOnlyFieldHeader className='col-span-12' title='SAP Fields' description='SAP related fields' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Code' value={item?.ItemCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Manufacturer Code' value={item?.FirmCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Manufacturer Name' value={item?.FirmName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Code' value={item?.ItmsGrpCod || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Name' value={item?.ItmsGrpNam || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Price'
          value={formatNumber(item?.Price, DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Inventory item record meta data' />

        <RecordMetaData
          createdAt={item.createdAt}
          updatedAt={item.updatedAt}
          deletedAt={item.deletedAt}
          createdBy={item.createdBy}
          updatedBy={item.updatedBy}
          deletedBy={item.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
