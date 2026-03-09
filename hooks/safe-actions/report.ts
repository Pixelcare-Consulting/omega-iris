import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getReportsClient } from '@/actions/report'

export function useReports(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getReportsClient)

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
