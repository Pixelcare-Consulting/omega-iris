import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getBpProfileCompanyOptionsClient } from '@/actions/user-bp-profile'
import { BpProfileType } from '@/utils/user-bp-profile'

export function useBpProfileCompanyOptions(profileType: BpProfileType, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getBpProfileCompanyOptionsClient)

  useEffect(() => {
    execute({ profileType })
  }, [profileType, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
