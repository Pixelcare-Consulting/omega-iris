import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getProjectIndividualsByGroupCodeClient } from '@/actions/project-individual'

export function useProjectIndividualsByGroupCodeClient(groupCode: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getProjectIndividualsByGroupCodeClient)

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
