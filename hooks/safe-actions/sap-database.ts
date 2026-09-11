import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getSapDatabasesClient } from '@/actions/sap-database'

export function useSapDatabases(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSapDatabasesClient)

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
