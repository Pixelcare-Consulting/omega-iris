'use client'

import { useEffect, useRef } from 'react'
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

import { useFormContext, useWatch } from 'react-hook-form'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { ItemForm } from '@/schema/item'

type ItemWarehouseInventoryFormProps = {
  isLoading?: boolean
}

export default function ItemWarehouseInventoryForm({ isLoading }: ItemWarehouseInventoryFormProps) {
  const dataGridRef = useRef<DataGridRef | null>(null)

  const form = useFormContext<ItemForm>()

  // const warehouseInventory = useWatch({ control: form.control, name: 'warehouseInventory' }) || []

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [isLoading, dataGridRef.current])

  return (
    <>
      <Separator className='col-span-12' />
      <ReadOnlyFieldHeader className='col-span-12 mb-2' title='Warehouse Inventory' description='Item warehouse inventory details' />

      {/* 
      <div className='col-span-12'>
        <DataGrid
          ref={dataGridRef}
          dataSource={warehouseInventory}
          keyExpr='code'
          showBorders
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          onRowUpdated={(e) => {
            const index = e.key
            const updatedRows = [...warehouseInventory]
            const rowIndex = updatedRows.findIndex((x) => x.code === index)

            if (rowIndex !== -1) {
              updatedRows[rowIndex] = e.data //* update rows
              form.setValue('warehouseInventory', updatedRows)
            }
          }}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' allowEditing={false} alignment='center' />
          <Column dataField='name' dataType='string' caption='Name' allowEditing={false} alignment='center' />
          <Column dataField='isLocked' dataType='boolean' caption='Lock' alignment='center' />
          <Column dataField='inStock' dataType='number' caption='In Stock' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='committed' dataType='number' caption='Committed' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='ordered' dataType='number' caption='Ordered' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='available' dataType='number' caption='Available' format={DEFAULT_NUMBER_FORMAT} alignment='center' />

          <LoadPanel enabled={isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />
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
      </div> */}
    </>
  )
}
