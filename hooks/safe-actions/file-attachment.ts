import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

import { getFileAttachmentsByRefCodeClient } from '@/actions/file-attachment'

export function useFileAttachmentsByRefCode(modelName: string, refCode?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getFileAttachmentsByRefCodeClient)

  useEffect(() => {
    execute({ modelName, refCode })
  }, [modelName, refCode, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
