import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBpsClient } from '@/actions/business-partner'

export function useBps(cardType: string, excludeCodes?: number[] | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBpsClient)

  useEffect(() => {
    execute({ cardType, excludeCodes })
  }, [JSON.stringify(cardType), JSON.stringify(excludeCodes), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
