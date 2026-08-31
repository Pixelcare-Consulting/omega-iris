'use client'

import { Column, DataGridRef } from 'devextreme-react/data-grid'
import { useEffect, useRef } from 'react'
import Toolbar from 'devextreme-react/toolbar'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useSapItemStockListByWarehouse } from '@/hooks/safe-actions/warehouse-item-inventory'
import FormMessage from '@/components/forms/form-message'

type WarehouseItemInventoryTabProps = {
  warehouseCode: string
  isSynced: boolean
  itemInventory: ReturnType<typeof useSapItemStockListByWarehouse>
}

export default function WarehouseItemInventoryTab({ warehouseCode, isSynced, itemInventory }: WarehouseItemInventoryTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-warehouse-item-inventory'
  const DATAGRID_UNIQUE_KEY = 'warehouse-item-inventory'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (itemInventory.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [itemInventory.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5 px-4'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={itemInventory.isLoading}
        />
      </Toolbar>

      {!isSynced && (
        <div className='col-span-12 px-4'>
          <FormMessage>Warehouse "{warehouseCode}" is not synced, item inventory not available</FormMessage>
        </div>
      )}

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={itemInventory.data}
          isLoading={isSynced && itemInventory.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='ItemCode'
          dataGridStore={dataGridStore}
        >
          <Column dataField='ItemCode' dataType='string' minWidth={150} caption='MFG P/N' sortOrder='asc' />
          <Column dataField='ItemName' dataType='string' minWidth={200} caption='Description' />
          <Column dataField='WhsCode' dataType='string' caption='Warehouse' />
          <Column dataField='OnHand' dataType='number' caption='On Hand' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
          <Column dataField='IsCommited' dataType='number' caption='Committed' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
          <Column dataField='OnOrder' dataType='number' caption='On Order' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
          <Column dataField='DeliveredQty' dataType='number' caption='Delivered Qty' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
        </CommonDataGrid>
      </div>
    </div>
  )
}
