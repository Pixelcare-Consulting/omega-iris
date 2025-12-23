import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBusinessTypesClient } from '@/actions/business-type'

export function useBusinessTypes(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBusinessTypesClient)

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
