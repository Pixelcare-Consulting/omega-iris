import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getRoleSapDatabasesClient } from '@/actions/role-sap-database'

export function useRoleSapDatabases(roleCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getRoleSapDatabasesClient)

  useEffect(() => {
    execute({ roleCode })
  }, [roleCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
