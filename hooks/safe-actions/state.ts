import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getStatesClient } from '@/actions/state'

export function useStates(countryCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getStatesClient)

  const sapResult = result.data as any

  useEffect(() => {
    execute({ countryCode })
  }, [countryCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: sapResult?.value ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
