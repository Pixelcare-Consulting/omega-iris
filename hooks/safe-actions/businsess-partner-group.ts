import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBpGroupByCodeClient, getBpGroupsClient } from '@/actions/business-partner-group'

export function useBpGroups(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBpGroupsClient)

  const sapResult = result.data as any

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: sapResult?.value ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useBpGroupByCode(code: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBpGroupByCodeClient)

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
