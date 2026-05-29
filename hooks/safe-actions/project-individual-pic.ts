import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPiPicsByProjectCodeClient, getPiPicsByUserCodeClient } from '@/actions/project-individual-pic'

export function usePiPicsByProjectCode(projectCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPiPicsByProjectCodeClient)

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

export function usePiPicsByUserCode(userCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPiPicsByUserCodeClient)

  useEffect(() => {
    execute({ userCode })
  }, [userCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
