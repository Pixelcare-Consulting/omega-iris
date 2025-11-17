import { getUserByIdClient } from '@/actions/users'
import { useAction } from 'next-safe-action/hooks'
import { useEffect } from 'react'

export default function useUserByIdClient(id?: string | null, dependencies?: any[]) {
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
