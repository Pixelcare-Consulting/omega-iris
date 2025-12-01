'use client'

import { useEffect, useMemo, useRef } from 'react'
import DataGrid, {
  Column,
  DataGridRef,
  Editing,
  Item,
  LoadPanel,
  Pager,
  Paging,
  Scrolling,
  SearchPanel,
  Sorting,
  Toolbar,
} from 'devextreme-react/data-grid'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'

import { getProjecItems } from '@/actions/project-item'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useProjectItemWarehouseInventoryByPItemCodeClient } from '@/hooks/safe-actions/project-item-warehouse-inventory'
import { formatNumber } from 'devextreme/localization'
import { handleOnRowPrepared } from '@/utils/devextreme'

type ProjectIndividualItemViewProps = {
  data: Awaited<ReturnType<typeof getProjecItems>>[number]
  onClose: () => void
}

export default function ProjectIndividualItemView({ data, onClose }: ProjectIndividualItemViewProps) {
  const pItemWarehouseInventories = useProjectItemWarehouseInventoryByPItemCodeClient(data?.code)
  const item = data.item

  const dataGridRef = useRef<DataGridRef | null>(null)

  const warehouseInventories = useMemo(() => {
    return pItemWarehouseInventories.data.map((wi) => ({
      code: wi.warehouseCode,
      name: wi.warehouse.name,
      isLocked: wi.isLocked,
      inStock: wi.inStock,
      committed: wi.committed,
      ordered: wi.ordered,
      available: wi.available,
    }))
  }, [JSON.stringify(pItemWarehouseInventories)])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (pItemWarehouseInventories.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [JSON.stringify(pItemWarehouseInventories), dataGridRef.current])

  return (
    <ScrollView>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Item Overview'
          description='Inventory item overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

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

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Manufacturer Name' value={''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Code' value={item?.ItmsGrpCod || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Name' value={''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Price'
          value={formatNumber(item?.Price as any, DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyFieldHeader className='col-span-12' title='Warehouse Inventory' description='Project item address details' />

        <div className='col-span-12'>
          <DataGrid
            dataSource={warehouseInventories}
            keyExpr='code'
            showBorders
            hoverStateEnabled
            allowColumnReordering
            allowColumnResizing
            width='100%'
            height='100%'
            onRowPrepared={handleOnRowPrepared}
            editing={{ allowAdding: false, allowUpdating: false, allowDeleting: false }}
          >
            <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' alignment='center' />
            <Column dataField='name' dataType='string' caption='Name' alignment='center' />
            <Column dataField='isLocked' dataType='boolean' caption='Lock' alignment='center' />
            <Column dataField='inStock' dataType='number' caption='In Stock' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
            <Column dataField='committed' dataType='number' caption='Committed' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
            <Column dataField='ordered' dataType='number' caption='Ordered' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
            <Column dataField='available' dataType='number' caption='Available' format={DEFAULT_NUMBER_FORMAT} alignment='center' />

            <LoadPanel enabled={pItemWarehouseInventories.isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />
            <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
            <SearchPanel visible highlightCaseSensitive={false} />
            <Sorting mode='multiple' />
            <Scrolling mode='standard' />

            <Toolbar>
              <Item name='searchPanel' location='after' />
            </Toolbar>

            <Pager
              visible={true}
              allowedPageSizes={DATAGRID_PAGE_SIZES}
              showInfo
              displayMode='full'
              showPageSizeSelector
              showNavigationButtons
            />
            <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
          </DataGrid>
        </div>

        <ReadOnlyFieldHeader className='col-span-12 mt-4' title='Record Meta dataz' description='Project item record meta data' />

        <RecordMetaData
          createdAt={data.createdAt}
          updatedAt={data.updatedAt}
          deletedAt={data.deletedAt}
          createdBy={data.createdBy}
          updatedBy={data.updatedBy}
          deletedBy={data.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
