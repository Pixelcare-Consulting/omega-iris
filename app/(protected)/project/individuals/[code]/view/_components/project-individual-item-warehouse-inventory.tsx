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
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'

import { handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'

type ProjectItemWarehouseInventory = {
  itemWarehouseInventory: ReturnType<typeof useItemWarehouseInventory>
}

export default function ProjectIndividualItemWarehouseInventory({ itemWarehouseInventory }: ProjectItemWarehouseInventory) {
  const dataGridRef = useRef<DataGridRef | null>(null)

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (itemWarehouseInventory.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [itemWarehouseInventory.isLoading, dataGridRef.current])

  return (
    <>
      <Separator className='col-span-12' />
      <ReadOnlyFieldHeader className='col-span-12 mb-2' title='Warehouse Inventory' description='Item warehouse inventory details' />

      <div className='col-span-12'>
        <DataGrid
          ref={dataGridRef}
          dataSource={itemWarehouseInventory.data}
          keyExpr='warehouse.code'
          showBorders
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          editing={{ allowAdding: false, allowUpdating: false, allowDeleting: false }}
        >
          <Column dataField='warehouse.code' width={100} dataType='string' caption='ID' sortOrder='asc' alignment='center' />
          <Column dataField='warehouse.name' dataType='string' caption='Name' alignment='center' />
          <Column dataField='isLocked' dataType='boolean' caption='Lock' alignment='center' />
          <Column dataField='inStock' dataType='number' caption='In Stock' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='committed' dataType='number' caption='Committed' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='ordered' dataType='number' caption='Ordered' format={DEFAULT_NUMBER_FORMAT} alignment='center' />
          <Column dataField='available' dataType='number' caption='Available' format={DEFAULT_NUMBER_FORMAT} alignment='center' />

          <LoadPanel enabled={itemWarehouseInventory.isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />
          <Editing mode='cell' allowUpdating={false} allowAdding={false} allowDeleting={false} />
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
    </>
  )
}
