'use client'

import { useMemo } from 'react'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'

import { getWarehouseBinLocations } from '@/actions/warehouse-bin-location'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import { useSession } from 'next-auth/react'

type WarehouseBinLocationViewProps = {
  warehouseName: string
  data: Awaited<ReturnType<typeof getWarehouseBinLocations>>[number]
  onClose: () => void
}

export default function WarehouseBinLocationView({ warehouseName, data, onClose }: WarehouseBinLocationViewProps) {
  const { data: session } = useSession()

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  return (
    <ScrollView useNative>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Bin Location Overview'
          description='Warehouse bin location overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Warehouse Code' value={data.WarehouseCode}>
          <Copy value={data.WarehouseCode} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Warehouse Name' value={warehouseName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Code' value={data.BinCode}>
          <Copy value={data.BinCode} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-6' title='Description' value={data?.Description || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Sub Levels' description='Bin location sub level details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Area' value={data?.SL1Code || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Location' value={data?.SL2Code || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Company' value={data?.SL3Code || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Palette/Box' value={data?.SL4Code || ''} />

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader className='col-span-12 mt-4' title='Record Meta data' description='Bin location record meta data' />

            <RecordMetaData
              createdAt={data.createdAt}
              updatedAt={data.updatedAt}
              deletedAt={data.deletedAt}
              createdBy={data.createdBy}
              updatedBy={data.updatedBy}
              deletedBy={data.deletedBy}
            />
          </>
        )}
      </div>
    </ScrollView>
  )
}
