import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getSyncMetaByCodeClient } from '@/actions/sync-meta'

export function useSyncMeta(code: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSyncMetaByCodeClient)

  useEffect(() => {
    execute({ code })
  }, [code, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
