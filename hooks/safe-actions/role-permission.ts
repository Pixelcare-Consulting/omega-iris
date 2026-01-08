import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getRolePermissionsClient } from '@/actions/role-permission'

export function useRolePermissions(roleId: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getRolePermissionsClient)

  useEffect(() => {
    execute({ roleId })
  }, [roleId, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
