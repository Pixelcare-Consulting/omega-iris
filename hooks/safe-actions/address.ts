import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getAddressesClient, getMasterAddressesClient } from '@/actions/address'

export function useAddresses(cardCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getAddressesClient)

  useEffect(() => {
    execute({ cardCode })
  }, [cardCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useMasterAddresses(cardCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getMasterAddressesClient)

  const sapResult = result.data as any

  useEffect(() => {
    execute({ cardCode })
  }, [cardCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: sapResult?.value ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
