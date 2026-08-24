import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBatchesMasterByProjectCodeClient, getBatchesMasterByWarehouseCodeClient } from '@/actions/batches'

export function useBatchesMasterByWarehouseCode(warehouseCode: string, isSynced: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBatchesMasterByWarehouseCodeClient)

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

export function useBatchesMasterByWarehouseProjectCode(projectCode: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBatchesMasterByProjectCodeClient)

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
