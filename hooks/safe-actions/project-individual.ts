import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getPisByBpUserCodeClient, getPisByGroupCodeClient, getPisClient } from '@/actions/project-individual'

export function usePisByGroupCode(groupCode: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPisByGroupCodeClient)

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

export function usePis(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPisClient)

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

export function usePisByBpUserCode(userCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPisByBpUserCodeClient)

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
