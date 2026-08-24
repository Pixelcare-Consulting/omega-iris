import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehouseBinLocationsClient } from '@/actions/warehouse-bin-location'

export function useWarehouseBinLocations(warehouseCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehouseBinLocationsClient)

  useEffect(() => {
    execute({ warehouseCode })
  }, [warehouseCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
