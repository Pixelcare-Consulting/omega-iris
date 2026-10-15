import { Prisma } from '@prisma/client'
import { format, subDays } from 'date-fns'
import { unique } from 'radash'

import { db } from '@/utils/db'
import logger from '@/utils/logger'
import { chunkArray, safeParseFloat, safeParseInt } from '@/utils'
import { parseSapCompactDate } from '@/utils/sap'
import { isCustomTfsEnabled } from '@/utils/sap-database-access'
import { Job } from './types'
import { callSapServiceLayerApi } from '@/actions/sap-service-layer'
import {
  OPEN_PO_LINE_SYNC_COUNT_QUERY_CODE,
  OPEN_PO_LINE_SYNC_JOB_CODE,
  OPEN_PO_LINE_SYNC_MAX_PAGE_SIZE,
  OPEN_PO_LINE_SYNC_META_CODE,
  OPEN_PO_LINE_SYNC_QUERY_CODE,
  OPEN_PO_LINE_STOCK_COUNT_QUERY_CODE,
  OPEN_PO_LINE_STOCK_QUERY_CODE,
  SAP_BASE_URL,
} from '@/constants/sap'

//* pulls the purchase order lines of every project into PoLineItem, feeds the project "Open POs" tab
//! runs from the cron with no session, so dbCode is always passed in and never read from cookies

const FIRST_SYNC_DATE = new Date('2020-01-01')

//* how many values one IN lookup may carry
const IN_CHUNK_SIZE = 5_000

//* how many rows one write round trip may carry
const WRITE_CHUNK_SIZE = 500

//* how many days before the last sync to re read, covers the day sap dates sit behind ours
const SYNC_LOOKBACK_DAYS = safeParseInt(process.env.LOOKBACK_DAYS) || 2

export type OpenPoLineSyncResult = {
  dbCode: string
  fetched: number
  created: number
  updated: number
  deleted: number
  stockUpdated: number
  skipped: number
  skippedReasons: Record<string, number>
  durationMs: number
}

type SapPoLineRow = {
  //* po line (POR1)
  DocEntry: number
  LineNum: number
  ItemCode?: string | null
  Dscription?: string | null
  U_CPN?: string | null
  WhsCode?: string | null
  ShipDate?: string | null
  BaseQty?: number | null
  BaseOpnQty?: number | null
  OpenQty?: number | null
  OpenInvQty?: number | null
  OpenRtnQty?: number | null
  OpenCreQty?: number | null
  DelivrdQty?: number | null
  OrderedQty?: number | null
  QtyToShip?: number | null
  PackQty?: number | null
  LineStatus?: string | null

  //* po header (OPOR)
  DocNum: number
  CardCode?: string | null
  DocDate?: string | null
  DocDueDate?: string | null
  U_ProjectID?: number | string | null
  CANCELED?: string | null
  CreateDate?: string | null
  UpdateDate?: string | null

  //* item stock in the line warehouse (OITW)
  OnHand?: number | null
  IsCommited?: number | null
}

//* one row per item/whs pair (OITW)
type SapPoLineStockRow = {
  ItemCode?: string | null
  WhsCode?: string | null
  OnHand?: number | null
  IsCommited?: number | null
}

//* the unique key of PoLineItem
function rowKey(projectIndividualCode: number, itemCode: string, docNum: number, lineNum: number) {
  return [projectIndividualCode, itemCode, docNum, lineNum].join('|')
}

function stockKey(itemCode: string, whsCode: string) {
  return [itemCode, whsCode].join('|')
}

function trimmed(value?: string | null) {
  const result = typeof value === 'string' ? value.trim() : ''
  return result || null
}

//* a line is gone from the portal once sap closes it or cancels the whole po
//* CANCELED is 'Y' on a cancelled po and 'C' on the cancellation document itself
function isClosedLine(row: SapPoLineRow) {
  return trimmed(row?.LineStatus) === 'C' || ['Y', 'C'].includes(trimmed(row?.CANCELED) || '')
}

async function findInChunks<T, R>(values: T[], query: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
  if (values.length < 1) return []

  const results = await Promise.all(chunkArray(values, IN_CHUNK_SIZE).map(query))

  return results.flat()
}

//? the query compares against date columns, so send a plain date and let SAP widen it
//! reach back past the last sync, sap dates are day granular and its clock sits a day behind ours
function buildParamList(lastSyncDate: Date) {
  return `lastSyncDate='${format(subDays(lastSyncDate, SYNC_LOOKBACK_DAYS), 'yyyy-MM-dd')}'`
}

async function fetchQueryCount(dbCode: string, countQueryCode: string, paramList?: string) {
  const response = await callSapServiceLayerApi({
    dbCode,
    url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${countQueryCode}')/List`,
    method: 'post',
    ...(paramList && { data: { ParamList: paramList } }),
  })

  if (response?.error) throw new Error(response?.message || `SAP rejected the ${countQueryCode} query`)

  return safeParseInt(response?.value?.[0]?.TotalCount)
}

//* counts first, then pulls every page at once
async function fetchQueryRows<T>(dbCode: string, queryCode: string, countQueryCode: string, paramList?: string): Promise<T[]> {
  const totalCount = await fetchQueryCount(dbCode, countQueryCode, paramList)

  if (totalCount < 1) return []

  const totalPages = Math.ceil(totalCount / OPEN_PO_LINE_SYNC_MAX_PAGE_SIZE)

  const requestPromises: Promise<any>[] = []

  for (let page = 0; page < totalPages; page++) {
    const skip = page * OPEN_PO_LINE_SYNC_MAX_PAGE_SIZE //* offset

    requestPromises.push(
      callSapServiceLayerApi({
        dbCode,
        url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${queryCode}')/List?$skip=${skip}`,
        headers: { Prefer: `odata.maxpagesize=${OPEN_PO_LINE_SYNC_MAX_PAGE_SIZE}` },
        method: 'post',
        ...(paramList && { data: { ParamList: paramList } }),
      })
    )
  }

  const responses = await Promise.all(requestPromises)

  const failed = responses.find((response) => response?.error)
  if (failed) throw new Error(failed?.message || `SAP rejected the ${queryCode} query`)

  return responses.flatMap((response) => response?.value || []).filter(Boolean)
}

function fetchPoLineRows(dbCode: string, lastSyncDate: Date) {
  return fetchQueryRows<SapPoLineRow>(dbCode, OPEN_PO_LINE_SYNC_QUERY_CODE, OPEN_PO_LINE_SYNC_COUNT_QUERY_CODE, buildParamList(lastSyncDate))
}

//! stock moves without touching the po, so the incremental po read alone would leave it stale on untouched lines
//* reads the current stock of every item/whs pair on an open po line and writes it to the portal lines of that pair
async function refreshPoLineStocks(dbCode: string, userId: string | null) {
  const [stockRows, poLines] = await Promise.all([
    fetchQueryRows<SapPoLineStockRow>(dbCode, OPEN_PO_LINE_STOCK_QUERY_CODE, OPEN_PO_LINE_STOCK_COUNT_QUERY_CODE),
    db.poLineItem.findMany({ where: { dbCode }, select: { ItemCode: true, WhsCode: true, OnHand: true, IsCommited: true } }),
  ])

  const stockByPair = new Map<string, { OnHand: number; IsCommited: number }>()

  for (const row of stockRows) {
    const itemCode = trimmed(row?.ItemCode)
    const whsCode = trimmed(row?.WhsCode)
    if (!itemCode || !whsCode) continue

    stockByPair.set(stockKey(itemCode, whsCode), { OnHand: safeParseFloat(row?.OnHand), IsCommited: safeParseFloat(row?.IsCommited) })
  }

  //* one write per pair, and only when a line of that pair is behind
  const changed = new Map<string, { itemCode: string; whsCode: string; OnHand: number; IsCommited: number }>()

  for (const line of poLines) {
    if (!line.WhsCode) continue

    const key = stockKey(line.ItemCode, line.WhsCode)
    const stock = stockByPair.get(key)

    if (!stock || changed.has(key)) continue
    if (safeParseFloat(line.OnHand) === stock.OnHand && safeParseFloat(line.IsCommited) === stock.IsCommited) continue

    changed.set(key, { itemCode: line.ItemCode, whsCode: line.WhsCode, ...stock })
  }

  let updated = 0

  for (const chunk of chunkArray([...changed.values()], WRITE_CHUNK_SIZE)) {
    const results = await db.$transaction(
      chunk.map((entry) =>
        db.poLineItem.updateMany({
          where: { dbCode, ItemCode: entry.itemCode, WhsCode: entry.whsCode },
          //* the cron has no user, keep the last editor instead of nulling it
          data: { OnHand: entry.OnHand, IsCommited: entry.IsCommited, ...(userId && { updatedBy: userId }) },
        })
      )
    )

    updated += results.reduce((total, result) => total + result.count, 0)
  }

  return updated
}

async function upsertSyncMeta(dbCode: string, lastSyncAt: Date, userId: string | null) {
  await db.syncMeta.upsert({
    where: { dbCode_code: { dbCode, code: OPEN_PO_LINE_SYNC_META_CODE } },
    create: {
      dbCode,
      code: OPEN_PO_LINE_SYNC_META_CODE,
      description: 'Last open po line synced date',
      lastSyncAt,
      createdBy: userId,
      updatedBy: userId,
    },
    //* the cron has no user, keep the last editor instead of nulling it
    update: { lastSyncAt, ...(userId && { updatedBy: userId }) },
  })
}

export async function syncOpenPoLinesFromSap(
  dbCode: string,
  options?: { userId?: string | null; trigger?: 'cron' | 'manual' }
): Promise<OpenPoLineSyncResult> {
  //! the manual button calls this too, so the guard lives here and not only in the loop below
  if (!(await isCustomTfsEnabled(dbCode))) {
    throw new Error('The custom TFS process is off for this database, so open PO lines are not synced from SAP.')
  }

  const startedAt = Date.now()
  const trigger = options?.trigger || 'cron'
  const userId = options?.userId || null

  const skippedReasons: Record<string, number> = {}
  const skip = (reason: string) => (skippedReasons[reason] = (skippedReasons[reason] || 0) + 1)

  const syncMeta = await db.syncMeta.findUnique({ where: { dbCode_code: { dbCode, code: OPEN_PO_LINE_SYNC_META_CODE } } })
  const lastSyncDate = syncMeta?.lastSyncAt || FIRST_SYNC_DATE

  //* the sync date only moves after the whole run lands, so a failed run replays instead of losing rows
  const runStartedAt = new Date()

  const rows = await fetchPoLineRows(dbCode, lastSyncDate)

  if (rows.length < 1) {
    //* no po changed, but stock still moves
    const stockUpdated = await refreshPoLineStocks(dbCode, userId)

    await upsertSyncMeta(dbCode, runStartedAt, userId)

    return {
      dbCode,
      fetched: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      stockUpdated,
      skipped: 0,
      skippedReasons,
      durationMs: Date.now() - startedAt,
    }
  }

  const docEntries = unique(rows.map((row) => safeParseInt(row?.DocEntry)).filter((docEntry) => docEntry > 0))
  const rowProjectCodes = unique(rows.map((row) => safeParseInt(row?.U_ProjectID)).filter((code) => code > 0))

  const [projectIndividuals, existingPoLines] = await Promise.all([
    findInChunks(rowProjectCodes, (chunk) =>
      db.projectIndividual.findMany({ where: { dbCode, code: { in: chunk } }, select: { code: true } })
    ),
    //* every portal line of the fetched pos, the query returns all lines of a touched po so these are reconciled in full
    findInChunks(docEntries, (chunk) =>
      db.poLineItem.findMany({
        where: { dbCode, DocEntry: { in: chunk } },
        select: { id: true, projectIndividualCode: true, ItemCode: true, DocNum: true, LineNum: true },
      })
    ),
  ])

  const projectCodes = new Set(projectIndividuals.map((project) => project.code))

  //* last row of a key wins, so one run never writes the same line twice
  const reshaped = new Map<string, Prisma.PoLineItemUncheckedCreateInput>()

  for (const row of rows) {
    if (isClosedLine(row)) continue

    const itemCode = trimmed(row?.ItemCode)
    const docNum = safeParseInt(row?.DocNum)
    const docEntry = safeParseInt(row?.DocEntry)
    const lineNum = safeParseInt(row?.LineNum)
    const projectIndividualCode = safeParseInt(row?.U_ProjectID)

    if (!docNum || !docEntry) {
      skip(`${String(row?.DocNum)} - po number does not exist`)
      continue
    }

    if (!itemCode) {
      skip(`${String(docNum)} - po line has no item code`)
      continue
    }

    if (!projectIndividualCode || !projectCodes.has(projectIndividualCode)) {
      skip(`${String(row?.U_ProjectID)} - project individual does not exist`)
      continue
    }

    reshaped.set(rowKey(projectIndividualCode, itemCode, docNum, lineNum), {
      dbCode,
      projectIndividualCode,
      DocEntry: docEntry,
      LineNum: lineNum,
      ItemCode: itemCode,
      Dscription: trimmed(row?.Dscription),
      U_CPN: trimmed(row?.U_CPN),
      WhsCode: trimmed(row?.WhsCode),
      ShipDate: parseSapCompactDate(row?.ShipDate),
      BaseQty: safeParseFloat(row?.BaseQty),
      BaseOpnQty: safeParseFloat(row?.BaseOpnQty),
      OpenQty: safeParseFloat(row?.OpenQty),
      OpenInvQty: safeParseFloat(row?.OpenInvQty),
      OpenRtnQty: safeParseFloat(row?.OpenRtnQty),
      OpenCreQty: safeParseFloat(row?.OpenCreQty),
      DelivrdQty: safeParseFloat(row?.DelivrdQty),
      OrderedQty: safeParseFloat(row?.OrderedQty),
      QtyToShip: safeParseFloat(row?.QtyToShip),
      PackQty: safeParseFloat(row?.PackQty),
      LineStatus: trimmed(row?.LineStatus),
      DocNum: docNum,
      CardCode: trimmed(row?.CardCode),
      DocDate: parseSapCompactDate(row?.DocDate),
      DocDueDate: parseSapCompactDate(row?.DocDueDate),
      CANCELED: trimmed(row?.CANCELED),
      CreateDate: parseSapCompactDate(row?.CreateDate),
      UpdateDate: parseSapCompactDate(row?.UpdateDate),
      OnHand: safeParseFloat(row?.OnHand),
      IsCommited: safeParseFloat(row?.IsCommited),
    })
  }

  //! a portal line of a fetched po that is no longer open is removed for good — closed, cancelled, removed from the po,
  //! or moved to another project or item, its old key has no match in the open set
  const existingByKey = new Map<string, string>()
  const toDelete: string[] = []

  for (const line of existingPoLines) {
    const key = rowKey(line.projectIndividualCode, line.ItemCode, line.DocNum, line.LineNum)

    if (reshaped.has(key)) existingByKey.set(key, line.id)
    else toDelete.push(line.id)
  }

  const toCreate: Prisma.PoLineItemCreateManyInput[] = []
  const toUpdate: { id: string; data: Prisma.PoLineItemUncheckedUpdateInput }[] = []

  for (const [key, data] of reshaped) {
    const existingId = existingByKey.get(key)

    if (existingId) {
      const { dbCode: _dbCode, projectIndividualCode, ItemCode, DocNum, LineNum, ...sapOwned } = data

      //* the cron has no user, keep the last editor instead of nulling it
      toUpdate.push({ id: existingId, data: { ...sapOwned, ...(userId && { updatedBy: userId }) } })

      continue
    }

    toCreate.push({ ...data, createdBy: userId, updatedBy: userId })
  }

  //* closed lines go first, before anything is written
  for (const chunk of chunkArray(toDelete, IN_CHUNK_SIZE)) {
    await db.poLineItem.deleteMany({ where: { dbCode, id: { in: chunk } } })
  }

  //! chunk by chunk, not one big transaction — an interactive transaction times out after 5 seconds by default and a first sync is far longer
  for (const chunk of chunkArray(toCreate, WRITE_CHUNK_SIZE)) {
    await db.poLineItem.createMany({ data: chunk })
  }

  //* the array form batches the whole chunk into one round trip
  for (const chunk of chunkArray(toUpdate, WRITE_CHUNK_SIZE)) {
    await db.$transaction(chunk.map((entry) => db.poLineItem.update({ where: { id: entry.id }, data: entry.data })))
  }

  //* after the line writes, so new and untouched lines both end on current stock
  const stockUpdated = await refreshPoLineStocks(dbCode, userId)

  await upsertSyncMeta(dbCode, runStartedAt, userId)

  const skipped = Object.values(skippedReasons).reduce((total, count) => total + count, 0)

  const result: OpenPoLineSyncResult = {
    dbCode,
    fetched: rows.length,
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    stockUpdated,
    skipped,
    skippedReasons,
    durationMs: Date.now() - startedAt,
  }

  logger.info({ ...result, trigger }, 'Open po line sync finished')

  return result
}

//* one run across every active database, used by the cron
export async function syncOpenPoLinesForAllDatabases() {
  //! only databases running the custom tfs process
  const databases = await db.sapDatabase.findMany({
    where: { isActive: true, isEnabledCustomTfsProcess: true },
    select: { dbCode: true },
  })

  const results: OpenPoLineSyncResult[] = []

  //! sequential on purpose — each database opens its own sap session and a parallel run burns licenses
  for (const database of databases) {
    try {
      results.push(await syncOpenPoLinesFromSap(database.dbCode, { trigger: 'cron' }))
    } catch (error) {
      logger.error({ dbCode: database.dbCode, error }, 'Open po line sync failed')
    }
  }

  return results
}

export const openPoLineSyncJob: Job = {
  code: OPEN_PO_LINE_SYNC_JOB_CODE,
  description: 'Sync open purchase order lines into the iris portal project po line items',
  schedule: process.env.OPEN_PO_LINE_SYNC_CRON || '0 20 * * *',
  run: async () => {
    await syncOpenPoLinesForAllDatabases()
  },
}
