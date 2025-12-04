import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWoStatusUpdatesByWoCodeClient } from '@/actions/work-order-status-update'

export function useWoStatusUpdatesByWoCode(workOrderCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWoStatusUpdatesByWoCodeClient)

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
