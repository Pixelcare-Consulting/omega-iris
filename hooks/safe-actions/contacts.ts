import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getContactsClient, getMasterContactsClient } from '@/actions/contact'

export function useContacts(cardCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getContactsClient)

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

export function useMasterContacts(cardCode: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getMasterContactsClient)

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
