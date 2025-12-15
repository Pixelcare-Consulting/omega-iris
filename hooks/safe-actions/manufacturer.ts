import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getManufacturersClient, getManufacturerByCodeClient } from '@/actions/manufacturer'

export function useManufacturers(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getManufacturersClient)

  const sapResult = result.data as any

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: sapResult?.value ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useManufacturerByCode(code: number, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getManufacturerByCodeClient)

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
