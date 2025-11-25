'use client'

import { useEffect, useRef } from 'react'
import DataGrid, { Column, DataGridRef, Editing, LoadPanel, Pager, Paging, Scrolling, Sorting } from 'devextreme-react/data-grid'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { useFormContext, useWatch } from 'react-hook-form'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'

import { handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { InventoryForm } from '@/schema/inventory'

type InventoryWarehouseFormProps = {
  isLoading?: boolean
}

export default function InventoryWarehouseForm({ isLoading }: InventoryWarehouseFormProps) {
  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore([
    'showFilterRow',
    'setShowFilterRow',
    'showHeaderFilter',
    'setShowHeaderFilter',
    'showFilterBuilderPanel',
    'setShowFilterBuilderPanel',
    'showGroupPanel',
    'setShowGroupPanel',
    'enableStateStoring',
    'columnHidingEnabled',
    'setColumnHidingEnabled',
    'showColumnChooser',
    'setShowColumnChooser',
  ])

  const form = useFormContext<InventoryForm>()

  const warehouseInventories = useWatch({ control: form.control, name: 'warehouseInventory' }) || []

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
      <ReadOnlyFieldHeader className='col-span-12 mb-2' title='Warehouse Inventory' description='Inventory address details' />

      <div className='col-span-12'>
        <DataGrid
          ref={dataGridRef}
          dataSource={warehouseInventories}
          keyExpr='code'
          showBorders
          columnHidingEnabled={dataGridStore.columnHidingEnabled}
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          toolbar={{ visible: false }}
          onRowUpdated={(e) => {
            const index = e.key
            const updatedRows = [...warehouseInventories]
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

          <Sorting mode='multiple' />
          <Scrolling mode='standard' />

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
    </>
  )
}
