import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getSalesOrderByWorkOrderCodeClient } from '@/actions/sales-order'

export function useSalesOrderByWorkOrderCode(code?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSalesOrderByWorkOrderCodeClient)

  const sapResult = result.data as any

  useEffect(() => {
    execute({ code })
  }, [code, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: sapResult?.value?.[0] ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
