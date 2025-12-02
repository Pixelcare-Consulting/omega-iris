import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getItemsClient } from '@/actions/item'

export default function useItems(excludeCodes?: number[] | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemsClient)

  console.log({ excludeCodes })

  useEffect(() => {
    execute({ excludeCodes })
  }, [JSON.stringify(excludeCodes), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
