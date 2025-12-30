import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getCountriesClient } from '@/actions/country'

export function useCountries(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getCountriesClient)

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
