import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehouseInventoriesByItemCodeClient } from '@/actions/warehouse-inventory'

export function useWarehouseInventoriesByItemCodeClient(itemCode?: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehouseInventoriesByItemCodeClient)

  useEffect(() => {
    execute({ itemCode })
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
