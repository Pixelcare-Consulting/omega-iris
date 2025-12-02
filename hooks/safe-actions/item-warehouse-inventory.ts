import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getItemWarehouseInventoryByItemCodeClient } from '@/actions/item-warehouse-inventory'

export function useItemWarehouseInventory(itemCode?: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemWarehouseInventoryByItemCodeClient)

  useEffect(() => {
    execute({ itemCode })
  }, [itemCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
