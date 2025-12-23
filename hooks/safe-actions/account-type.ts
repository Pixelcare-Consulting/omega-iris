import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getAccountTypesClient } from '@/actions/account-type'

export function useAccountTypes(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getAccountTypesClient)

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
