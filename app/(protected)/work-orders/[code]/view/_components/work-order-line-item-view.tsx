'use client'

import { useMemo, useRef } from 'react'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { LoadPanel } from 'devextreme-react/load-panel'

import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { formatNumber } from 'devextreme/localization'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import { WorkOrderItemForm } from '@/schema/work-order'
import { safeParseFloat } from '@/utils'
import { format, isValid } from 'date-fns'
import Separator from '@/components/separator'

type WorkOrderLineItemViewProps = {
  data: Record<string, any> & WorkOrderItemForm
  onClose: () => void
}

export default function WorkOrderLineItemView({ data, onClose }: WorkOrderLineItemViewProps) {
  // const containerRef = useRef<HTMLDivElement>(null)

  const dateReceived = useMemo(() => {
    if (!data?.dateReceived || !isValid(data?.dateReceived)) return ''
    return format(data?.dateReceived, 'MM/dd/yyyy hh:mm a')
  }, [JSON.stringify(data?.dateReceived)])

  //* Temporary disable
  // const itemWarehouseInventory = useItemWarehouseInventory(data?.item?.code || '', [JSON.stringify(data)])

  //* Temporary disable
  // const selectedItemWarehouseInventory = useMemo(() => {
  //   if (itemWarehouseInventory.isLoading || itemWarehouseInventory.data.length < 1) return null
  //   return itemWarehouseInventory.data.find((wi) => wi.warehouseCode === data?.warehouseCode)
  // }, [JSON.stringify(itemWarehouseInventory), JSON.stringify(data)])

  // if (itemWarehouseInventory.isLoading)
  //   return (
  //     <div id='work-order-line-item-view-loading' className='relative mt-4 flex h-[60vh] w-full items-center justify-center'>
  //       <LoadPanel
  //         container='#work-order-line-item-view-loading'
  //         shadingColor='rgb(241, 245, 249)'
  //         position={{ of: containerRef?.current as any, at: 'center', my: 'center', offset: { x: 110, y: 55 } }}
  //         message='Loading data...'
  //         visible
  //         showIndicator
  //         showPane
  //         shading
  //       />
  //     </div>
  //   )

  return (
    <ScrollView>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Line Item Overview'
          description='Work order lineitem overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={data?.projectItemCode || ''}>
          <Copy value={data?.projectItemCode || ''} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Manufacturer' value={data?.FirmName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='MFG P/N' value={data?.ItemCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Description' value={data?.ItemName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Part Number' value={data?.partNumber || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Code' value={data?.dateCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Country Of Origin' value={data?.countryOfOrigin || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={data?.lotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet No' value={data?.lotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Packaging Type' value={data?.packagingType || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='SPQ' value={data?.spq || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Cost'
          value={formatNumber(safeParseFloat(data?.cost), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available To Order'
          value={formatNumber(safeParseFloat(data?.availableToOrder), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-In (In Process)'
          value={formatNumber(safeParseFloat(data?.stockIn), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-Out (Delivered)'
          value={formatNumber(safeParseFloat(data?.stockOut), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Total Stock'
          value={formatNumber(safeParseFloat(data?.totalStock), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Quantity'
          value={formatNumber(safeParseFloat(data?.qty), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField className='col-span-12' title='Notes' value={data?.notes || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Site Location' value={data?.siteLocation || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 2' value={data?.subLocation2 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 3' value={data?.subLocation3 || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Item Received ' description='Item date received and received by details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received By' value={data?.dateReceivedBy} />

        {/*   //* Temporary disable */}
        {/* <Separator className='col-span-12' />
        <ReadOnlyFieldHeader
          className='col-span-12 mb-1'
          title='Site Location '
          description='Item warehouse and warehouse inventory details'
        />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Warehouse' value={data?.warehouseName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Description' value={data?.warehouseDescription || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='In Stock'
          value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Committed'
          value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Ordered'
          value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available'
          value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
        /> */}
      </div>
    </ScrollView>
  )
}
