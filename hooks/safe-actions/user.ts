import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getUsersClient, getUserByIdClient, getNonCustomerUsersClient, getUsersByRoleKeyClient, getUserByCodeClient } from '@/actions/users'

export default function useUsers(dependencies?: any[]) {
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

export function useUserById(id?: string | null, dependencies?: any[]) {
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

export function useUserByCode(code?: number | null, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getUserByCodeClient)

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

export function useNonBpUsers(dependencies?: any[]) {
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

export function useUsersByRoleKey(key: string, dependencies?: any[]) {
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
