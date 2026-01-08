import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPermissionsClient } from '@/actions/permission'

export function usePermissions(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPermissionsClient)

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
