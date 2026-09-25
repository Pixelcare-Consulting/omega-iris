import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getCurrentUserHiddenFieldsClient } from '@/actions/user-hidden-field'
import { ModuleName } from '@/constants/module'

export function useCurrentUserHiddenFields(moduleName: ModuleName, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getCurrentUserHiddenFieldsClient)

  useEffect(() => {
    execute({ moduleName })
  }, [moduleName, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
