'use server'

import z from 'zod'
import { subtract } from 'mathjs'

import { db } from '@/utils/db'
import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { safeParseFloat } from '@/utils'
import { OpenPoLineSyncResult, syncOpenPoLinesFromSap } from '@/utils/jobs/open-po-line-sync'
import { OPEN_PO_LINE_SYNC_JOB_CODE } from '@/constants/sap'
import { runJobExclusive } from '@/utils/jobs/scheduler'

//* open po lines of a project, limited to the given warehouses
//* the sync already drops closed and cancelled lines, the status filter is only a guard
export async function getPoLineItems(dbCode: string, projectCode: number, warehouseCodes: string[]) {
  if (!projectCode || warehouseCodes.length < 1) return []

  try {
    const result = await db.poLineItem.findMany({
      where: {
        dbCode,
        projectIndividualCode: projectCode,
        WhsCode: { in: warehouseCodes },
        LineStatus: 'O',
        NOT: { CANCELED: { in: ['Y', 'C'] } },
      },
      orderBy: [{ DocNum: 'asc' }, { LineNum: 'asc' }],
    })

    return result.map((line) => ({
      ...line,
      BaseQty: safeParseFloat(line.BaseQty),
      BaseOpnQty: safeParseFloat(line.BaseOpnQty),
      OpenQty: safeParseFloat(line.OpenQty),
      OpenInvQty: safeParseFloat(line.OpenInvQty),
      OpenRtnQty: safeParseFloat(line.OpenRtnQty),
      OpenCreQty: safeParseFloat(line.OpenCreQty),
      DelivrdQty: safeParseFloat(line.DelivrdQty),
      OrderedQty: safeParseFloat(line.OrderedQty),
      QtyToShip: safeParseFloat(line.QtyToShip),
      PackQty: safeParseFloat(line.PackQty),
      OnHand: safeParseFloat(line.OnHand),
      IsCommited: safeParseFloat(line.IsCommited),
      //* per item in the line warehouse, so it repeats on every line of the same item
      availableToOrder: subtract(safeParseFloat(line.OnHand), safeParseFloat(line.IsCommited)),
      onOrder: safeParseFloat(line.OpenInvQty),
    }))
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPoLineItemsClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ projectCode: z.number(), warehouseCodes: z.array(z.string()) }))
  .action(async ({ ctx, parsedInput: data }) => {
    return getPoLineItems(ctx.dbCode, data.projectCode, data.warehouseCodes)
  })

//* same core the cron runs, so the button and the schedule can never drift apart
export const syncOpenPoLinesFromSapClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .action(async ({ ctx }) => {
    const { dbCode, userId } = ctx

    let result: OpenPoLineSyncResult | null = null

    try {
      const started = await runJobExclusive(OPEN_PO_LINE_SYNC_JOB_CODE, async () => {
        result = await syncOpenPoLinesFromSap(dbCode, { userId, trigger: 'manual' })
      })

      //* the cron or another user already has a run going
      if (!started) {
        return {
          error: true,
          status: 409,
          message: 'An open PO line sync is already running, please try again in a moment.',
          action: 'SYNC_OPEN_PO_LINES_FROM_SAP',
        }
      }
    } catch (error) {
      console.error('Open po line sync error:', error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Open PO line sync error!',
        action: 'SYNC_OPEN_PO_LINES_FROM_SAP',
      }
    }

    const stats = result as OpenPoLineSyncResult | null

    return {
      status: 200,
      message: `${stats?.created || 0} created, ${stats?.updated || 0} updated, ${stats?.deleted || 0} removed, ${stats?.stockUpdated || 0} stock refreshed, ${stats?.skipped || 0} skipped.`,
      action: 'SYNC_OPEN_PO_LINES_FROM_SAP',
      data: stats,
    }
  })