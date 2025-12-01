'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getInventoryByCode } from '@/actions/inventory'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { format, isValid } from 'date-fns'
import { safeParseFloat } from '@/utils'

type InventoryOverviewTabProps = {
  inventory: NonNullable<Awaited<ReturnType<typeof getInventoryByCode>>>
}

export default function InvetoryOverviewTab({ inventory }: InventoryOverviewTabProps) {
  const customerName = inventory.user ? `${inventory.user.fname} ${inventory.user.lname}` : ''
  const customerId = inventory.user ? inventory.user.code : ''

  const spq = inventory?.spq
    ? String(inventory.spq)
        .replaceAll(' ', '')
        .split(',')
        .map((s) => safeParseFloat(s))
    : null

  const projectName = inventory?.projectIndividual?.name || ''
  const projectId = inventory?.projectIndividual?.code || ''

  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Inventory overview information' />

        <ReadOnlyField
          className='col-span-12 lg:col-span-3'
          value={
            <img
              src={inventory.thumbnail || '/images/placeholder-img.jpg'}
              className='size-[280px] w-full rounded-2xl object-cover object-center'
            />
          }
        />

        <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
          <ReadOnlyField className='col-span-12' title='ID' value={inventory.code}>
            <Copy value={inventory.code} />
          </ReadOnlyField>

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Customer ID' value={customerId}>
            <Copy value={customerId} />
          </ReadOnlyField>

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Customer Name' value={customerName} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Project ID' value={projectId}>
            <Copy value={customerId} />
          </ReadOnlyField>

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Project Name' value={projectName} />

          <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Part Number' value={inventory.partNumber} />

          <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Manufacturer' value={inventory.manufacturer} />

          <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='MFG P/N' value={inventory.manufacturerPartNumber} />
        </div>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Description' value={inventory.description} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Date Received'
          value={inventory?.dateReceived && isValid(inventory?.dateReceived) ? format(inventory.dateReceived, 'MM-dd-yyyy') : '-'}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Code' value={inventory?.dateCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={inventory?.lotCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Country of Origin'
          value={inventory?.countryOfOrigin || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Packaging Type' value={inventory?.packagingType || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='SPQ'
          value={
            spq && spq.length > 0
              ? spq
                  .filter(Boolean)
                  .map((s) => formatNumber(s, DEFAULT_NUMBER_FORMAT))
                  .join(', ')
              : ''
          }
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet Size' value={inventory?.palletSize || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet No' value={inventory?.palletNo || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={inventory?.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField className='col-span-12' title='Notes' value={inventory?.notes || ''} />

        <ReadOnlyFieldHeader className='col-span-12' title='Address Details' description='Inventory address information' />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Site Location' value={inventory.siteLocation || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Sub Location 1' value={inventory.subLocation1 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 2' value={inventory.subLocation2 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 3' value={inventory.subLocation3 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 4' value={inventory.subLocation4 || ''} />

        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Inventory record meta data' />

        <RecordMetaData
          createdAt={inventory.createdAt}
          updatedAt={inventory.updatedAt}
          deletedAt={inventory.deletedAt}
          createdBy={inventory.createdBy}
          updatedBy={inventory.updatedBy}
          deletedBy={inventory.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
