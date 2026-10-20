import { useEffect, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getCurrentUserHiddenFieldsClient } from '@/actions/user-hidden-field'
import { ModuleName } from '@/constants/module'

export function useCurrentUserHiddenFields(moduleName: ModuleName, dependencies?: any[]) {
  //* data is [] until the first fetch settles, so callers can tell "nothing hidden" apart from "not loaded yet"
  //? latched so a refetch does not flip it back and remount whatever waits on it
  const [isReady, setIsReady] = useState(false)

  const {
    execute,
    executeAsync,
    isExecuting: isLoading,
    result,
  } = useAction(getCurrentUserHiddenFieldsClient, {
    onSettled: () => setIsReady(true),
  })

  useEffect(() => {
    execute({ moduleName })
  }, [moduleName, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    isReady,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
