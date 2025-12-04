'use client'

import { useEffect, useMemo, useRef } from 'react'
import DataGrid, {
  Column,
  DataGridRef,
  Editing,
  Item,
  Pager,
  Paging,
  Scrolling,
  SearchPanel,
  Sorting,
  Toolbar,
} from 'devextreme-react/data-grid'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { LoadPanel } from 'devextreme-react/load-panel'

import { getProjecItems } from '@/actions/project-item'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { formatNumber } from 'devextreme/localization'
import { handleOnRowPrepared } from '@/utils/devextreme'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import { WorkOrderItemForm } from '@/schema/work-order'
import { useWoItemByWoCodeByPiCodeWithWhouseCode } from '@/hooks/safe-actions/work-order-item'
import useDebug from '@/hooks/use-debug'
import { PositionAlignment } from 'devextreme/common'
import { PositionConfig } from 'devextreme/common/core/animation'
import { safeParseFloat } from '@/utils'
import { format, isValid } from 'date-fns'
import { useUserByCode, useUserById } from '@/hooks/safe-actions/user'

type WorkOrderLineItemViewProps = {
  workOrderCode: number
  data: WorkOrderItemForm
  onClose: () => void
}

export default function WorkOrderLineItemView({ workOrderCode, data, onClose }: WorkOrderLineItemViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const woItem = useWoItemByWoCodeByPiCodeWithWhouseCode(workOrderCode, data.projectItemCode, data.warehouseCode)

  const dateReceived = useMemo(() => {
    if (woItem.isLoading || !woItem.data || !woItem.data?.dateReceived) return ''

    const value = woItem.data.dateReceived
    if (!isValid(value)) return ''
    return format(value, 'MM/dd/yyyy hh:mm a')
  }, [JSON.stringify(woItem)])

  const dateReceivedBy = useUserByCode(woItem.data?.dateReceivedBy)

  const projectItem = useMemo(() => {
    if (woItem.isLoading || !woItem.data || !woItem.data?.projectItem || !woItem.data?.projectItem?.item) return null
    return woItem.data.projectItem
  }, [JSON.stringify(woItem)])

  const itemWarehouseInventory = useMemo(() => {
    if (!projectItem?.item?.itemWarehouseInventory?.length) return null
    return projectItem?.item?.itemWarehouseInventory?.[0]
  }, [JSON.stringify(projectItem)])

  if (woItem.isLoading)
    return (
      <div id='work-order-line-item-view-loading' className='relative mt-4 flex h-[60vh] w-full items-center justify-center'>
        <LoadPanel
          container='#work-order-line-item-view-loading'
          shadingColor='rgb(241, 245, 249)'
          position={{ of: containerRef?.current as any, at: 'center', my: 'center', offset: { x: 110, y: 55 } }}
          message='Loading data...'
          visible
          showIndicator
          showPane
          shading
        />
      </div>
    )

  return (
    <ScrollView>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Line Item Overview'
          description='Work order lineitem overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={projectItem?.code || ''}>
          <Copy value={projectItem?.code || ''} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Manufacturer'
          value={projectItem?.item?.manufacturer || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='MFG P/N'
          value={projectItem?.item?.manufacturerPartNumber || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Description'
          value={projectItem?.item?.description || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Part Number' value={woItem.data?.partNumber || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Code' value={woItem.data?.dateCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Country Of Origin'
          value={woItem.data?.countryOfOrigin || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={woItem.data?.lotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet No' value={woItem.data?.lotCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Packaging Type'
          value={woItem.data?.packagingType || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='SPQ' value={woItem.data?.spq || ''} />

        <ReadOnlyFieldHeader className='col-span-12' title='Cost and Quantity' description='Item cost and quantity details' />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Cost'
          value={formatNumber(safeParseFloat(woItem.data?.cost), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Quantity'
          value={formatNumber(safeParseFloat(woItem.data?.qty), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Item Received' description='Item date received and received by details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Received By'
          value={
            dateReceivedBy?.data
              ? `${dateReceivedBy?.data?.fname || ''}${dateReceivedBy?.data?.lname ? ` ${dateReceivedBy?.data?.lname}` : ''}`
              : ''
          }
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Site Location' description='Item site location and inventory details' />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Warehouse'
          value={itemWarehouseInventory?.warehouse?.name || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Price'
          value={formatNumber(safeParseFloat(projectItem?.item?.Price), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='In Stock'
          value={formatNumber(safeParseFloat(itemWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Committed'
          value={formatNumber(safeParseFloat(itemWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Ordered'
          value={formatNumber(safeParseFloat(itemWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Available'
          value={formatNumber(safeParseFloat(itemWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
        />
      </div>
    </ScrollView>
  )
}
