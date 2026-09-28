import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getWarehouseSubLevelCodesClient } from '@/actions/warehouse-sublevel-code'

export function useWarehouseSubLevelCodes(sublevel: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getWarehouseSubLevelCodesClient)

  useEffect(() => {
    execute({ sublevel })
  }, [sublevel, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
