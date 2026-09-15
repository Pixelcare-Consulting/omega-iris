'use server'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { WO_DELIVERY_SYNC_JOB_CODE } from '@/constants/sap'
import { runJobExclusive } from '@/utils/jobs/scheduler'
import { syncWorkOrderDeliveriesFromSap, WoDeliverySyncResult } from '@/utils/jobs/wo-delivery-sync'

//! lives outside actions/work-order.ts on purpose, the job imports creditStock from there and importing it back would be a cycle

//* same core the cron runs, so the button and the schedule can never drift apart
export const syncWorkOrderDeliveriesFromSapClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .action(async ({ ctx }) => {
    const { dbCode, userId } = ctx

    let result: WoDeliverySyncResult | null = null

    try {
      const started = await runJobExclusive(WO_DELIVERY_SYNC_JOB_CODE, async () => {
        result = await syncWorkOrderDeliveriesFromSap(dbCode, { userId, trigger: 'manual' })
      })

      //* the cron or another user already has a run going
      if (!started) {
        return {
          error: true,
          status: 409,
          message: 'A work order delivery sync is already running, please try again in a moment.',
          action: 'SYNC_WORK_ORDER_DELIVERIES_FROM_SAP',
        }
      }
    } catch (error) {
      console.error('Work order delivery sync error:', error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Work order delivery sync error!',
        action: 'SYNC_WORK_ORDER_DELIVERIES_FROM_SAP',
      }
    }

    const stats = result as WoDeliverySyncResult | null

    return {
      status: 200,
      message: `${stats?.delivered || 0} delivered, ${stats?.partialDelivered || 0} partially delivered, ${stats?.skipped || 0} skipped.`,
      action: 'SYNC_WORK_ORDER_DELIVERIES_FROM_SAP',
      data: stats,
    }
  })