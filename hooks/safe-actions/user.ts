import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getUsersClient, getUserByIdClient, getNonCustomerUsersClient, getUsersByRoleKeyClient } from '@/actions/users'

export default function useUsersClient(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getUsersClient)

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useUserByIdClient(id?: string | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getUserByIdClient)

  useEffect(() => {
    execute({ id })
  }, [id, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? null,
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useNonBpUsersClient(dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getNonCustomerUsersClient)

  useEffect(() => {
    execute()
  }, [...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}

export function useUsersByRoleKeyClient(key: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getUsersByRoleKeyClient)

  useEffect(() => {
    execute({ key })
  }, [key, ...(dependencies || [])])

  return {
    execute,
    executeAsync,
    isLoading,
    data: result.data ?? [],
    error: { serverError: result.serverError, validationError: result.validationErrors },
  }
}
