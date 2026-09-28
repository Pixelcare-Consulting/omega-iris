import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehouseBinLocationsClient } from '@/actions/warehouse-bin-location'

export function useWarehouseBinLocations(warehouseCode: string, dependencies?: any[], isEnabled = true) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehouseBinLocationsClient)

  useEffect(() => {
    //* callers switch this off when the feature that needs bin locations is hidden
    if (!isEnabled) return
    execute({ warehouseCode })
  }, [warehouseCode, isEnabled, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
