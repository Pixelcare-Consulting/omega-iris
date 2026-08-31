import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehousesByProjectCodeClient, getWarehousesClient } from '@/actions/warehouse'

//* warehouses assigned to a project individual, used wherever a project scopes its own warehouse list
export function useWarehousesByProjectCode(projectCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehousesByProjectCodeClient)

  useEffect(() => {
    execute({ projectCode })
  }, [projectCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useWarehouses(isSynced?: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehousesClient)

  useEffect(() => {
    execute({ isSynced })
  }, [isSynced, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
