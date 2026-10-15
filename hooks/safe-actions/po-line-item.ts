import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getPoLineItemsClient } from '@/actions/po-line-item'

export function usePoLineItems(projectCode: number, warehouseCodes: string[], dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getPoLineItemsClient)

  useEffect(() => {
    execute({ projectCode, warehouseCodes })
  }, [projectCode, JSON.stringify(warehouseCodes), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}