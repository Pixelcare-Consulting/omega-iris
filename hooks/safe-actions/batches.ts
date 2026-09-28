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

export function useBatchesMasterByWarehouseProjectCode(
  projectCode: number,
  warehouseCodes: string[] = [],
  dependencies?: any[],
  isEnabled = true
) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBatchesMasterByProjectCodeClient)

  useEffect(() => {
    //* callers switch this off when the feature that needs batches is hidden
    if (!isEnabled) return
    execute({ projectCode, warehouseCodes })
  }, [projectCode, isEnabled, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
