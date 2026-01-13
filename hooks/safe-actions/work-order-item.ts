import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWoItemsByWoCodeClient } from '@/actions/work-order-item'

export function useWoItemsByWoCode(workOrderCode?: number | number[] | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWoItemsByWoCodeClient)

  useEffect(() => {
    execute({ workOrderCode })
  }, [JSON.stringify(workOrderCode), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
