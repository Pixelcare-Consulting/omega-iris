import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehousesByProjectCodeClient, getWarehousesClient } from '@/actions/warehouse'

//* warehouses assigned to a project individual, used wherever a project scopes its own warehouse list
export function useWarehousesByProjectCode(projectCode?: number | null, dependencies?: any[], isEnabled = true) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehousesByProjectCodeClient)

  useEffect(() => {
    //* callers switch this off when the feature that needs warehouses is hidden
    if (!isEnabled) return
    execute({ projectCode })
  }, [projectCode, isEnabled, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useWarehouses(isSynced?: boolean, dependencies?: any[], isEnabled = true) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehousesClient)

  useEffect(() => {
    //* callers switch this off when the feature that needs warehouses is hidden
    if (!isEnabled) return
    execute({ isSynced })
  }, [isSynced, isEnabled, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
