import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPiSuppliersByProjectCodeClient } from '@/actions/project-individual-supplier'

export function usePiSuppliersByProjectCode(projectCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPiSuppliersByProjectCodeClient)

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
