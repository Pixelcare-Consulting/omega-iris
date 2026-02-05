import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBpsClient, getLatestBpMasterClient } from '@/actions/business-partner'

export function useBps(cardType: string | string[], isSynced?: boolean | null, excludeCodes?: number[] | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBpsClient)

  useEffect(() => {
    execute({ cardType, isSynced, excludeCodes })
  }, [JSON.stringify(cardType), isSynced, JSON.stringify(excludeCodes), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useLatestBp(cardType: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getLatestBpMasterClient)

  useEffect(() => {
    execute({ cardType })
  }, [JSON.stringify(cardType), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
