import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getPaymentTermsClient } from '@/actions/payment-term'

export function usePaymentTerms(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPaymentTermsClient)

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
