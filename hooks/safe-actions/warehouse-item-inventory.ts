import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getSapItemStockByWarehouseClient, getSapItemStockListByWarehouseClient } from '@/actions/warehouse-item-inventory'

//* every item held in a warehouse, live from SAP
export function useSapItemStockListByWarehouse(warehouseCode: string, isSynced: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSapItemStockListByWarehouseClient)

  useEffect(() => {
    execute({ warehouseCode, isSynced })
  }, [warehouseCode, isSynced, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

//* live SAP stock for an item in a warehouse, only queried once both are selected
export function useSapItemStockByWarehouse(warehouseCode?: string | null, itemCode?: string | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSapItemStockByWarehouseClient)

  useEffect(() => {
    if (!warehouseCode || !itemCode) return
    execute({ warehouseCode, itemCode })
  }, [warehouseCode, itemCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
