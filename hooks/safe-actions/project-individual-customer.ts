import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPiCustomersByProjectCodeClient } from '@/actions/project-individual-customer'

export function usePiCustomerByProjectCode(projectCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPiCustomersByProjectCodeClient)

  useEffect(() => {
    execute({ projectCode })
  }, [projectCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
