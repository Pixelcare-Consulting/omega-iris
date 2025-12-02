import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehousesClient } from '@/actions/warehouse'

export function useWarehouse(isDefault?: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehousesClient)

  useEffect(() => {
    execute({ isDefault })
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
