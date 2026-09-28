'use client'

import { formatNumber } from 'devextreme/localization'

import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { Badge } from '@/components/badge'
import { DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { safeParseFloat } from '@/utils'
import { useSapItemStockByWarehouse } from '@/hooks/safe-actions/warehouse-item-inventory'

type ProjectIndividualItemSapInventoryProps = {
  warehouseCode?: string | null
  itemCode?: string | null
  emptyText?: string
  className?: string
}

export default function ProjectIndividualItemSapInventory({
  warehouseCode,
  itemCode,
  emptyText = 'Select an item and a warehouse to see its stock in SAP.',
  className = 'col-span-12',
}: ProjectIndividualItemSapInventoryProps) {
  //* live SAP stock, only fetched once both the item and the warehouse are known
  const sapItemStock = useSapItemStockByWarehouse(warehouseCode, itemCode)

  return (
    <div className={`${className} grid grid-cols-12 gap-5 rounded-md bg-green-100/60 p-4 ring-1 ring-green-500/10`}>
      <ReadOnlyFieldHeader
        className='col-span-12 mb-1'
        title={
          <span className='inline-flex items-center gap-2'>
            SAP Item Inventory Data
            <Badge variant='soft-green' className='gap-1.5'>
              <span className='size-1.5 rounded-full bg-green-500' />
              Live
            </Badge>
          </span>
        }
        description='Stock of the selected item in the selected warehouse, straight from SAP'
      />

      {!warehouseCode || !itemCode ? (
        <div className='col-span-12 text-xs italic text-slate-500'>{emptyText}</div>
      ) : sapItemStock.isLoading ? (
        <div className='col-span-12 text-xs italic text-slate-500'>Loading SAP inventory...</div>
      ) : !sapItemStock.data ? (
        <div className='col-span-12 text-xs italic text-slate-500'>
          No SAP inventory found for item "{itemCode}" in warehouse "{warehouseCode}".
        </div>
      ) : (
        <>
          <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Item Code' value={sapItemStock.data.ItemCode} />

          <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Warehouse Code' value={sapItemStock.data.WhsCode} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Item Name' value={sapItemStock.data.ItemName} />

          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='On Hand'
            value={formatNumber(safeParseFloat(sapItemStock.data.OnHand), DEFAULT_NUMBER_FORMAT)}
          />

          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='Committed'
            value={formatNumber(safeParseFloat(sapItemStock.data.IsCommited), DEFAULT_NUMBER_FORMAT)}
          />

          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='On Order'
            value={formatNumber(safeParseFloat(sapItemStock.data.OnOrder), DEFAULT_NUMBER_FORMAT)}
          />

          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='Delivered Qty'
            value={formatNumber(safeParseFloat(sapItemStock.data.DeliveredQty), DEFAULT_NUMBER_FORMAT)}
          />
        </>
      )}
    </div>
  )
}
