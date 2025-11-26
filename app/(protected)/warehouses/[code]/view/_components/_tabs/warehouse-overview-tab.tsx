'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getWarehouseByCode } from '@/actions/warehouse'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'

type WarehouseOverviewTabProps = {
  warehouse: NonNullable<Awaited<ReturnType<typeof getWarehouseByCode>>>
}

export default function WarehouseOverviewTab({ warehouse }: WarehouseOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Project group overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={warehouse.code}>
          <Copy value={warehouse.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Name' value={warehouse.name} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Description' value={warehouse?.description || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={warehouse.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Default' value={warehouse.isDefault ? 'Yes' : 'No'} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Nettable' value={warehouse.isNettable ? 'Yes' : 'No'} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Enable Bin Locations'
          value={warehouse.isEnableBinLocations ? 'Yes' : 'No'}
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Warehouse Location' description='Warehouse location details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Street 1' value={warehouse?.address1 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Street 2' value={warehouse?.address2 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Street 3' value={warehouse?.address3 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Street/PO Box' value={warehouse?.streetPoBox || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Street No.' value={warehouse?.streetNo || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Block' value={warehouse?.block || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Building/Floor/Room'
          value={warehouse?.buildingFloorRoom || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Zip Code' value={warehouse?.zipCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='City' value={warehouse?.city || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Country/Region' value={warehouse?.countryRegion || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='State' value={warehouse?.state || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='County' value={warehouse?.county || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Federal Tax ID' value={warehouse?.federalTaxId || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='GLN' value={warehouse?.gln || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Tax Office' value={warehouse?.taxOffice || ''} />

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
