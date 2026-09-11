import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'

import { getJobScheduleClient, getSyncMetaByCodeClient } from '@/actions/sync-meta'
import { describeCronSchedule } from '@/utils'

export function useSyncMeta(code: string, dependencies?: any[]) {
  const { execute, executeAsync, isExecuting: isLoading, result } = useAction(getSyncMetaByCodeClient)

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

//* the cron schedule of a background job, worded for the ui
export function useJobSchedule(code: string) {
  const { execute, isExecuting: isLoading, result } = useAction(getJobScheduleClient)

  useEffect(() => {
    execute({ code })
  }, [code])

  const schedule = result.data?.schedule ?? null

  //* isEnabled false means the schedule is off on this server, label is then empty so no caller can word a sync that never happens
  return { isLoading, schedule, isEnabled: !!result.data?.isEnabled && !!schedule, label: describeCronSchedule(schedule) }
}
