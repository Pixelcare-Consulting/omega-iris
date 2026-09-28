'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getWarehouseByCode } from '@/actions/warehouse'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Separator from '@/components/separator'

type WarehouseOverviewTabProps = {
  warehouse: NonNullable<Awaited<ReturnType<typeof getWarehouseByCode>>>
}

export default function WarehouseOverviewTab({ warehouse }: WarehouseOverviewTabProps) {
  return (
    <ScrollView useNative>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Project group overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={warehouse.code}>
          <Copy value={warehouse.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Code' value={warehouse?.WarehouseCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Name' value={warehouse.WarehouseName} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Status'
          value={warehouse.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Nettable' value={warehouse.Nettable ? 'Yes' : 'No'} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Enable Bin Locations'
          value={warehouse.EnableBinLocations ? 'Yes' : 'No'}
        />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Warehouse Location' description='Warehouse location details' />

        <ReadOnlyField className='col-span-12' title='Line 1' value={warehouse?.Street || ''} />

        <ReadOnlyField className='col-span-12' title='Line 2' value={warehouse?.Address2 || ''} />

        <ReadOnlyField className='col-span-12' title='Line 3' value={warehouse?.Address3 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Street No.' value={warehouse?.StreetNo || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Building/Floor/Room'
          value={warehouse?.BuildingFloorRoom || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Block' value={warehouse?.Block || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='City' value={warehouse?.City || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Zip Code' value={warehouse?.ZipCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='County' value={warehouse?.County || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Country' value={warehouse?.CountryName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='State' value={warehouse?.StateName || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Glboal Location Number (GLN)'
          value={warehouse?.GlobalLocationNumber || ''}
        />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Project group record meta data' />

        <RecordMetaData
          createdAt={warehouse.createdAt}
          updatedAt={warehouse.updatedAt}
          deletedAt={warehouse.deletedAt}
          createdBy={warehouse.createdBy}
          updatedBy={warehouse.updatedBy}
          deletedBy={warehouse.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
