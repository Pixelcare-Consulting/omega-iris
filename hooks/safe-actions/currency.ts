import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getCurrenciesClient } from '@/actions/currency'

export function useCurrencies(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getCurrenciesClient)

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
