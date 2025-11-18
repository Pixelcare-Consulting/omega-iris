import { getProjectGroupsClient } from '@/actions/project-group'
import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

export function useProjectGroupsClient(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getProjectGroupsClient)

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
