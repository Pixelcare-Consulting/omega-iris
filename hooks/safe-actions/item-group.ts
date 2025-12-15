import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getItemGroupByCodeClient, getItemGroupsClient } from '@/actions/item-group'

export function useItemGroups(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemGroupsClient)

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

export function useItemGroupByCode(code: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemGroupByCodeClient)

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
