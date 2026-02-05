import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getNotificationsClient, getUnReadNotificationsCountClient } from '@/actions/notification'

export function useNotifications(limit?: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getNotificationsClient)

  const returnValue = {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }

  useEffect(() => {
    execute({ limit })
  }, [limit, ...(dependencies || [])])

  return returnValue
}

export function useUnReadNotificationsCount(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getUnReadNotificationsCountClient)

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? 0,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
