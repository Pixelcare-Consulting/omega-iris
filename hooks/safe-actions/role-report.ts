import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getRoleReportsClient } from '@/actions/role-report'

export function useRoleReports(roleCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getRoleReportsClient)

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
