import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPgPicsByGroupCodeClient, getPgPicsByUserCodeClient } from '@/actions/project-group-pic'

export function usePgPicsByGroupCode(groupCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPgPicsByGroupCodeClient)

  useEffect(() => {
    execute({ groupCode })
  }, [groupCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function usePgPicsByUserCode(userCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPgPicsByUserCodeClient)

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
