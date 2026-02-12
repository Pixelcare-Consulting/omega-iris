import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getProjecItemsClient } from '@/actions/project-item'

export function useProjecItems(projectCode: number, isHideDeleted?: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getProjecItemsClient)

  useEffect(() => {
    execute({ projectCode, isHideDeleted })
  }, [projectCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
