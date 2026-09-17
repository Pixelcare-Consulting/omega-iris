import { format, subDays } from 'date-fns'
import { unique } from 'radash'

import { db } from '@/utils/db'
import logger from '@/utils/logger'
import { safeParseInt } from '@/utils'
import { Job } from './types'
import { creditStock } from '@/actions/work-order'
import { callSapServiceLayerApi } from '@/actions/sap-service-layer'
import { WORK_ORDER_STATUS_VALUE_MAP } from '@/schema/work-order'
import {
  SAP_BASE_URL,
  WO_DELIVERY_SYNC_COUNT_QUERY_CODE,
  WO_DELIVERY_SYNC_JOB_CODE,
  WO_DELIVERY_SYNC_MAX_PAGE_SIZE,
  WO_DELIVERY_SYNC_META_CODE,
  WO_DELIVERY_SYNC_QUERY_CODE,
} from '@/constants/sap'

//* marks work order items delivered from the batches of deliveries sap already closed via a/r invoice
//! runs from the cron with no session, so dbCode is always passed in and never read from cookies
//! omega fills in U_WorkOrderID on the sales order by hand, a blank or mistyped one skips that work order for good

const FIRST_SYNC_DATE = new Date('2020-01-01')

//* how many days before the last sync to re read, covers the day sap dates sit behind ours
const SYNC_LOOKBACK_DAYS = safeParseInt(process.env.LOOKBACK_DAYS) || 2

const VERIFIED = String(WORK_ORDER_STATUS_VALUE_MAP['Verified'])
const PARTIAL_DELIVERY_STATUS = String(WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'])
const DELIVERED_STATUS = String(WORK_ORDER_STATUS_VALUE_MAP['Delivered'])

//* only these two can move, a work order below verified has not been picked yet and one past delivered is finished
const SYNCABLE_STATUSES = [VERIFIED, PARTIAL_DELIVERY_STATUS]

export type WoDeliverySyncResult = {
  dbCode: string
  fetched: number
  workOrders: number
  partialDelivered: number
  delivered: number
  skipped: number
  skippedReasons: Record<string, number>
  durationMs: number
}

type SapDeliveredBatchRow = {
  AbsEntry?: number | null
  ItemCode?: string | null
  ItemName?: string | null
  FirmCode?: number | null
  FirmName?: string | null
  LastPurPrc?: number | null
  AvgPrice?: number | null
  Status?: string | null
  DistNumber: string
  MnfSerial?: string | null
  LotNumber?: string | null
  InDate?: string | null
  MnfDate?: string | null
  ExpDate?: string | null
  Notes?: string | null
  SysNumber?: number | null
  U_DateCode?: string | null
  U_Group?: string | null
  U_Division?: string | null
  U_Commodities?: string | null
  U_LotCode?: string | null
  U_PackagingType?: string | null
  U_SPQ?: string | null
  U_Owner?: string | null
  U_Site?: string | null
  U_PartNumber?: string | null
  U_ProjectID?: number | null
  U_CMSite?: string | null
  U_Phase?: string | null
  DocEntry?: number | null
  DocNum?: number | null
  DocDate?: string | null
  CardCode?: string | null
  CardName?: string | null
  DocStatus?: string | null
  CreateDate?: string | null
  UpdateDate?: string | null
  DocLine?: number | null
  WhsCode: string
  WhsName?: string | null
  Quantity?: number | null
  BinQuantity?: number | null
  BinAbs?: number | null
  BinCode?: string | null
  SoDocEntry?: number | null
  SoLineNum?: number | null
  SoDocNum?: number | null
  U_WorkOrderID?: string | number | null
}

function trimmed(value?: string | null) {
  const result = typeof value === 'string' ? value.trim() : ''
  return result || null
}

//* the batch is only the same line when the item matches too, a batch number alone can repeat across items
function batchKey(distNumber: string, itemCode: string) {
  return `${distNumber}|${itemCode}`
}

//? the query compares against date columns, so send a plain date and let SAP widen it
//! reach back past the last sync, sap dates are day granular and its clock sits a day behind ours
//* re fetching is free, an already delivered line is filtered out below, but missing a row leaves a work order stuck
function buildParamList(lastSyncDate: Date) {
  return `lastSyncDate='${format(subDays(lastSyncDate, SYNC_LOOKBACK_DAYS), 'yyyy-MM-dd')}'`
}

async function fetchDeliveredBatchRowsCount(dbCode: string, lastSyncDate: Date) {
  const response = await callSapServiceLayerApi({
    dbCode,
    url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${WO_DELIVERY_SYNC_COUNT_QUERY_CODE}')/List`,
    method: 'post',
    data: { ParamList: buildParamList(lastSyncDate) },
  })

  if (response?.error) throw new Error(response?.message || 'SAP rejected the delivered batch details count query')

  return safeParseInt(response?.value?.[0]?.TotalCount)
}

//* counts first, then pulls every page at once
async function fetchDeliveredBatchRows(dbCode: string, lastSyncDate: Date): Promise<SapDeliveredBatchRow[]> {
  const totalCount = await fetchDeliveredBatchRowsCount(dbCode, lastSyncDate)

  if (totalCount < 1) return []

  const totalPages = Math.ceil(totalCount / WO_DELIVERY_SYNC_MAX_PAGE_SIZE)
  const paramList = buildParamList(lastSyncDate)

  const requestPromises: Promise<any>[] = []

  for (let page = 0; page < totalPages; page++) {
    const skip = page * WO_DELIVERY_SYNC_MAX_PAGE_SIZE //* offset

    requestPromises.push(
      callSapServiceLayerApi({
        dbCode,
        url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${WO_DELIVERY_SYNC_QUERY_CODE}')/List?$skip=${skip}`,
        headers: { Prefer: `odata.maxpagesize=${WO_DELIVERY_SYNC_MAX_PAGE_SIZE}` },
        method: 'post',
        data: { ParamList: paramList },
      })
    )
  }

  const responses = await Promise.all(requestPromises)

  const failed = responses.find((response) => response?.error)
  if (failed) throw new Error(failed?.message || 'SAP rejected the delivered batch details query')

  return responses.flatMap((response) => response?.value || []).filter(Boolean)
}

export async function syncWorkOrderDeliveriesFromSap(
  dbCode: string,
  options?: { userId?: string | null; trigger?: 'cron' | 'manual' }
): Promise<WoDeliverySyncResult> {
  const startedAt = Date.now()
  const trigger = options?.trigger || 'cron'
  const userId = options?.userId || null

  const skippedReasons: Record<string, number> = {}
  const skip = (reason: string) => (skippedReasons[reason] = (skippedReasons[reason] || 0) + 1)

  const syncMeta = await db.syncMeta.findUnique({ where: { dbCode_code: { dbCode, code: WO_DELIVERY_SYNC_META_CODE } } })
  const lastSyncDate = syncMeta?.lastSyncAt || FIRST_SYNC_DATE

  //* the sync date only moves after the whole run lands, so a failed run replays instead of losing rows
  const runStartedAt = new Date()

  const saveSyncMeta = () =>
    db.syncMeta.upsert({
      where: { dbCode_code: { dbCode, code: WO_DELIVERY_SYNC_META_CODE } },
      create: {
        dbCode,
        code: WO_DELIVERY_SYNC_META_CODE,
        description: 'Last work order delivery synced date',
        lastSyncAt: runStartedAt,
        createdBy: userId,
        updatedBy: userId,
      },
      update: { lastSyncAt: runStartedAt, updatedBy: userId },
    })

  const rows = await fetchDeliveredBatchRows(dbCode, lastSyncDate)

  if (rows.length < 1) {
    await saveSyncMeta()

    return {
      dbCode,
      fetched: 0,
      workOrders: 0,
      partialDelivered: 0,
      delivered: 0,
      skipped: 0,
      skippedReasons,
      durationMs: Date.now() - startedAt,
    }
  }

  //* one entry per work order the delivered rows mention, holding the batches shipped and the delivery notes that shipped them
  const deliveredByWorkOrder = new Map<number, { batchKeys: Set<string>; docNums: Set<number> }>()

  for (const row of rows) {
    const workOrderCode = safeParseInt(row?.U_WorkOrderID)
    const docNum = safeParseInt(row?.DocNum)
    const distNumber = trimmed(row?.DistNumber)
    const itemCode = trimmed(row?.ItemCode)

    if (!workOrderCode) {
      skip(`${String(row?.U_WorkOrderID)} - work order id is not a number`)
      continue
    }

    if (!distNumber || !itemCode) {
      skip(`${workOrderCode} - delivery row has no batch number or item code`)
      continue
    }

    const entry = deliveredByWorkOrder.get(workOrderCode) || { batchKeys: new Set<string>(), docNums: new Set<number>() }

    entry.batchKeys.add(batchKey(distNumber, itemCode))

    if (docNum) entry.docNums.add(docNum)

    deliveredByWorkOrder.set(workOrderCode, entry)
  }

  const workOrderCodes = unique([...deliveredByWorkOrder.keys()])

  //! only verified and partially delivered work orders may move, anything else sap delivered was already settled here
  const workOrders = await db.workOrder.findMany({
    where: { dbCode, code: { in: workOrderCodes }, status: { in: SYNCABLE_STATUSES }, deletedAt: null },
    select: {
      id: true,
      code: true,
      status: true,
      workOrderItems: {
        select: {
          projectItemCode: true,
          isDelivered: true,
          isStockedIn: true,
          projectItem: { select: { code: true, DistNumber: true, item: { select: { ItemCode: true } } } },
        },
      },
    },
  })

  const foundCodes = new Set(workOrders.map((workOrder) => workOrder.code))

  for (const code of workOrderCodes) {
    if (!foundCodes.has(code)) skip(`${code} - work order is missing, deleted or not verified / partially delivered`)
  }

  let partialDelivered = 0
  let delivered = 0

  for (const workOrder of workOrders) {
    const entry = deliveredByWorkOrder.get(workOrder.code)!
    const lineItems = workOrder.workOrderItems

    if (lineItems.length < 1) {
      skip(`${workOrder.code} - work order has no line items`)
      continue
    }

    //* the lines this run newly delivers, an already delivered line is left alone so its stock is never moved twice
    //! only stocked in lines, creditStock skips the rest so they must not count toward fully delivered
    const deliveredProjectItems = lineItems
      .filter((lineItem) => !lineItem.isDelivered && lineItem.isStockedIn)
      .filter((lineItem) => {
        const distNumber = trimmed(lineItem.projectItem?.DistNumber)
        const itemCode = trimmed(lineItem.projectItem.item?.ItemCode)

        if (!distNumber || !itemCode) return false

        return entry.batchKeys.has(batchKey(distNumber, itemCode))
      })
      .map((lineItem) => lineItem.projectItem.code)

    //* nothing new came back for this work order, leave it as it is
    if (deliveredProjectItems.length < 1) {
      skip(`${workOrder.code} - no line item changed`)
      continue
    }

    //* every line is delivered once the ones already marked and the ones moving now cover the whole work order
    const isFullyDelivered = lineItems.every((lineItem) => lineItem.isDelivered || deliveredProjectItems.includes(lineItem.projectItemCode))

    const currentStatus = isFullyDelivered ? DELIVERED_STATUS : PARTIAL_DELIVERY_STATUS
    const docNums = [...entry.docNums].sort((a, b) => a - b)

    const comments = `Auto-synced from SAP: item/s delivered via DO ${docNums.map((docNum) => `${docNum}`).join(', ')}.`

    try {
      //! one transaction per work order, a work order that fails must not take the rest of the run with it
      await db.$transaction(
        async (tx) => {
          //! the list above was read outside this transaction, re read so the log keeps the status the work order really came from
          const current = await tx.workOrder.findFirst({ where: { id: workOrder.id }, select: { status: true } })
          const prevStatus = current?.status || workOrder.status

          //! the where clause is the guard, it only moves a work order still sitting on a syncable status
          //* someone may have cancelled, deleted or delivered it since, and that change must win over this run
          const moved = await tx.workOrder.updateMany({
            where: { id: workOrder.id, status: { in: SYNCABLE_STATUSES } },
            data: { status: currentStatus, updatedBy: userId },
          })

          if (moved.count < 1) throw new Error('the status changed before this sync could apply')

          await tx.workOrderStatusUpdate.create({
            data: {
              dbCode,
              workOrderCode: workOrder.code,
              prevStatus,
              currentStatus,
              comments,
              createdBy: userId,
              updatedBy: userId,
            },
          })

          //! creditStock owns isDelivered and the stock in / stock out / total stock movement, this job must never write them itself
          //? no goods receipt is posted here, that branch only fires when the new status is verified
          const credited = await creditStock({
            tx,
            dbCode,
            workOrderCode: workOrder.code,
            prevStatus,
            currStatus: currentStatus,
            deliveredProjectItems,
          })

          //* throw so the status update and the log roll back together with the stock
          if (credited?.error) throw credited
        },
        { timeout: 120000, maxWait: 10000 }
      )

      if (isFullyDelivered) delivered++
      else partialDelivered++
    } catch (error: any) {
      skip(`${workOrder.code} - ${error?.message || 'failed to update the work order status'}`)
      logger.error({ dbCode, workOrderCode: workOrder.code, currentStatus, error }, 'Work order delivery sync failed for a work order')
    }
  }

  await saveSyncMeta()

  const skipped = Object.values(skippedReasons).reduce((total, count) => total + count, 0)

  const result: WoDeliverySyncResult = {
    dbCode,
    fetched: rows.length,
    workOrders: workOrders.length,
    partialDelivered,
    delivered,
    skipped,
    skippedReasons,
    durationMs: Date.now() - startedAt,
  }

  logger.info({ ...result, trigger }, 'Work order delivery sync finished')

  return result
}

//* one run across every active database, used by the cron
export async function syncWorkOrderDeliveriesForAllDatabases() {
  const databases = await db.sapDatabase.findMany({ where: { isActive: true }, select: { dbCode: true } })

  const results: WoDeliverySyncResult[] = []

  //! sequential on purpose — each database opens its own sap session and a parallel run burns licenses
  for (const database of databases) {
    try {
      results.push(await syncWorkOrderDeliveriesFromSap(database.dbCode, { trigger: 'cron' }))
    } catch (error) {
      logger.error({ dbCode: database.dbCode, error }, 'Work order delivery sync failed')
    }
  }

  return results
}

export const woDeliverySyncJob: Job = {
  code: WO_DELIVERY_SYNC_JOB_CODE,
  description: 'Mark work order items delivered from the closed deliveries in sap',
  schedule: process.env.WO_DELIVERY_SYNC_CRON || '0 * * * *',
  run: async () => {
    await syncWorkOrderDeliveriesForAllDatabases()
  },
}
