import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getItemsClient } from '@/actions/item'

export default function useItems(isSynced?: boolean, excludeCodes?: number[] | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemsClient)

  useEffect(() => {
    execute({ isSynced, excludeCodes })
  }, [isSynced, JSON.stringify(excludeCodes), ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

//TODO: Use this when creating project item, when item is selected then fetch item master from sap to get its inventory data
//TODO: Need clarification whether project item will be related to warehouse
export function useItemMaster(isSynced?: boolean, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getItemsClient)

  useEffect(() => {
    execute({ isSynced })
  }, [isSynced, , ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
