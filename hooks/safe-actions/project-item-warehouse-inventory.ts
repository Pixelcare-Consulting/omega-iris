import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getProjectItemWarehouseInventoryByPItemCodeClient } from '@/actions/project-item-warehouse-inventory'

export function useProjectItemWarehouseInventoryByPItemCodeClient(projectItemCode?: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getProjectItemWarehouseInventoryByPItemCodeClient)

  useEffect(() => {
    execute({ projectItemCode })
  }, [projectItemCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
