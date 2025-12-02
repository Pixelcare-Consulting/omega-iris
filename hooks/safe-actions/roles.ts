import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getRolesClient } from '@/actions/roles'

export function useRoles(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getRolesClient)

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
