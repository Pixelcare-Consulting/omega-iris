import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getDuplicatedFromWoByCodeClient } from '@/actions/work-order'

export function useDuplicatedFromWoByCode(workOrderCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getDuplicatedFromWoByCodeClient)

  useEffect(() => {
    execute({ workOrderCode })
  }, [JSON.stringify(workOrderCode), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
