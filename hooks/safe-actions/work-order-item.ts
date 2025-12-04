import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWoItemByWoCodeByPiCodeWithWhouseCodeClient, getWoItemsByWoCodeClient } from '@/actions/work-order-item'

export function useWoItemsByWoCode(workOrderCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWoItemsByWoCodeClient)

  useEffect(() => {
    execute({ workOrderCode })
  }, [workOrderCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useWoItemByWoCodeByPiCodeWithWhouseCode(
  workOrderCode?: number | null,
  projectItemCode?: number | null,
  warehouseCode?: number | null,
  dependencies?: any[]
) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWoItemByWoCodeByPiCodeWithWhouseCodeClient)

  useEffect(() => {
    execute({ workOrderCode, projectItemCode, warehouseCode })
  }, [workOrderCode, projectItemCode, warehouseCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
