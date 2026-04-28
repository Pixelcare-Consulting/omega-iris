import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getReportsClient, getReportsByCodeClient } from '@/actions/report'

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

export function useReportByCode(code: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getReportsByCodeClient)

  useEffect(() => {
    execute({ code })
  }, [code, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
