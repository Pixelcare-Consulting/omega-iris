import { Prisma } from '@prisma/client'
import { format, subDays } from 'date-fns'
import { unique } from 'radash'

import { db } from '@/utils/db'
import logger from '@/utils/logger'
import { chunkArray, safeParseFloat, safeParseInt } from '@/utils'
import { parseSapCompactDate } from '@/utils/sap'
import { Job } from './types'
import { callSapServiceLayerApi } from '@/actions/sap-service-layer'
import {
  PROJECT_ITEM_SYNC_COUNT_QUERY_CODE,
  PROJECT_ITEM_SYNC_JOB_CODE,
  PROJECT_ITEM_SYNC_MAX_PAGE_SIZE,
  PROJECT_ITEM_SYNC_META_CODE,
  PROJECT_ITEM_SYNC_QUERY_CODE,
  SAP_BASE_URL,
} from '@/constants/sap'

//* pulls batch stock of every portal-synced warehouse into ProjectItem
//! runs from the cron with no session, so dbCode is always passed in and never read from cookies

const FIRST_SYNC_DATE = new Date('2020-01-01')

//* how many values one IN lookup may carry
const IN_CHUNK_SIZE = 5_000

//* how many rows one write round trip may carry
const WRITE_CHUNK_SIZE = 500

//* how many days before the last sync to re read, covers the day sap dates sit behind ours
const SYNC_LOOKBACK_DAYS = safeParseInt(process.env.LOOKBACK_DAYS) || 2

export type ProjectItemSyncResult = {
  dbCode: string
  fetched: number
  created: number
  updated: number
  skipped: number
  skippedReasons: Record<string, number>
  durationMs: number
}

type SapBatchRow = {
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
  U_Phase?: number | null
  CreateDate?: string | null
  UpdateDate?: string | null
  WhsCode: string
  WhsName?: string | null
  Quantity?: number | null
  CommitQty?: number | null
  OnHandQty?: number | null
  BinCode?: string | null
}

//* the unique key of ProjectItem, with '' standing in for the nullable parts
//! binCode is nullable so postgres treats those rows as always distinct — the constraint never catches them, dedupe has to happen here
function rowKey(distNumber: string, warehouseCode: string | null, binCode: string | null, projectIndividualCode: number) {
  return [distNumber, warehouseCode ?? '', binCode ?? '', projectIndividualCode].join('|')
}

function trimmed(value?: string | null) {
  const result = typeof value === 'string' ? value.trim() : ''
  return result || null
}

function uniqueStrings(values: (string | null | undefined)[]) {
  return unique(values.map(trimmed).filter(Boolean) as string[])
}

//! a first sync can name tens of thousands of batches, one big IN would blow the postgres bind parameter cap
async function findInChunks<T, R>(values: T[], query: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
  if (values.length < 1) return []

  const results = await Promise.all(chunkArray(values, IN_CHUNK_SIZE).map(query))

  return results.flat()
}

//? the query compares against date columns, so send a plain date and let SAP widen it
//! reach back past the last sync, sap dates are day granular and its clock sits a day behind ours
//* re fetching is free, the key map turns those rows into updates, but missing a row loses it for good
function buildParamList(lastSyncDate: Date) {
  return `lastSyncDate='${format(subDays(lastSyncDate, SYNC_LOOKBACK_DAYS), 'yyyy-MM-dd')}'`
}

async function fetchBatchRowsCount(dbCode: string, lastSyncDate: Date) {
  const response = await callSapServiceLayerApi({
    dbCode,
    url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${PROJECT_ITEM_SYNC_COUNT_QUERY_CODE}')/List`,
    method: 'post',
    data: { ParamList: buildParamList(lastSyncDate) },
  })

  if (response?.error) throw new Error(response?.message || 'SAP rejected the batch details count query')

  return safeParseInt(response?.value?.[0]?.TotalCount)
}

//* counts first, then pulls every page at once
async function fetchBatchRows(dbCode: string, lastSyncDate: Date): Promise<SapBatchRow[]> {
  const totalCount = await fetchBatchRowsCount(dbCode, lastSyncDate)

  if (totalCount < 1) return []

  const totalPages = Math.ceil(totalCount / PROJECT_ITEM_SYNC_MAX_PAGE_SIZE)
  const paramList = buildParamList(lastSyncDate)

  console.log({ paramList })

  const requestPromises: Promise<any>[] = []

  for (let page = 0; page < totalPages; page++) {
    const skip = page * PROJECT_ITEM_SYNC_MAX_PAGE_SIZE //* offset

    requestPromises.push(
      callSapServiceLayerApi({
        dbCode,
        url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('${PROJECT_ITEM_SYNC_QUERY_CODE}')/List?$skip=${skip}`,
        headers: { Prefer: `odata.maxpagesize=${PROJECT_ITEM_SYNC_MAX_PAGE_SIZE}` },
        method: 'post',
        data: { ParamList: paramList },
      })
    )
  }

  const responses = await Promise.all(requestPromises)

  const failed = responses.find((response) => response?.error)
  if (failed) throw new Error(failed?.message || 'SAP rejected the batch details query')

  return responses.flatMap((response) => response?.value || []).filter(Boolean)
}

export async function syncProjectItemsFromSap(
  dbCode: string,
  options?: { userId?: string | null; trigger?: 'cron' | 'manual' }
): Promise<ProjectItemSyncResult> {
  const startedAt = Date.now()
  const trigger = options?.trigger || 'cron'
  const userId = options?.userId || null

  const skippedReasons: Record<string, number> = {}
  const skip = (reason: string) => (skippedReasons[reason] = (skippedReasons[reason] || 0) + 1)

  const syncMeta = await db.syncMeta.findUnique({ where: { dbCode_code: { dbCode, code: PROJECT_ITEM_SYNC_META_CODE } } })
  const lastSyncDate = syncMeta?.lastSyncAt || FIRST_SYNC_DATE

  //* the sync date only moves after the whole run lands, so a failed run replays instead of losing rows
  const runStartedAt = new Date()

  const rows = await fetchBatchRows(dbCode, lastSyncDate)

  if (rows.length < 1) {
    await db.syncMeta.upsert({
      where: { dbCode_code: { dbCode, code: PROJECT_ITEM_SYNC_META_CODE } },
      create: {
        dbCode,
        code: PROJECT_ITEM_SYNC_META_CODE,
        description: 'Last project item batch synced date',
        lastSyncAt: runStartedAt,
      },
      update: { lastSyncAt: runStartedAt },
    })

    return { dbCode, fetched: 0, created: 0, updated: 0, skipped: 0, skippedReasons, durationMs: Date.now() - startedAt }
  }

  //* only look up what the batch rows actually mention
  const itemCodes = uniqueStrings(rows.map((row) => row.ItemCode))
  const distNumbers = uniqueStrings(rows.map((row) => row.DistNumber))
  const rowWarehouseCodes = uniqueStrings(rows.map((row) => row.WhsCode))
  const rowBinCodes = uniqueStrings(rows.map((row) => row.BinCode))
  const rowProjectCodes = unique(rows.map((row) => safeParseInt(row.U_ProjectID)).filter((code) => code > 0))

  const [items, projectIndividuals, warehouses, binLocations, existingProjectItems] = await Promise.all([
    findInChunks(itemCodes, (chunk) =>
      db.item.findMany({ where: { dbCode, ItemCode: { in: chunk } }, select: { code: true, ItemCode: true } })
    ),
    findInChunks(rowProjectCodes, (chunk) =>
      db.projectIndividual.findMany({ where: { dbCode, code: { in: chunk } }, select: { code: true } })
    ),
    findInChunks(rowWarehouseCodes, (chunk) =>
      db.warehouse.findMany({ where: { dbCode, WarehouseCode: { in: chunk } }, select: { WarehouseCode: true } })
    ),
    findInChunks(rowBinCodes, (chunk) =>
      db.warehouseBinLocation.findMany({ where: { dbCode, BinCode: { in: chunk } }, select: { BinCode: true } })
    ),
    findInChunks(distNumbers, (chunk) =>
      db.projectItem.findMany({
        where: { dbCode, DistNumber: { in: chunk } },
        select: { id: true, DistNumber: true, warehouseCode: true, binCode: true, projectIndividualCode: true },
      })
    ),
  ])

  const itemCodeToCode = new Map(items.map((item) => [item.ItemCode, item.code]))
  const projectCodes = new Set(projectIndividuals.map((project) => project.code))
  const warehouseCodes = new Set(warehouses.map((warehouse) => warehouse.WarehouseCode))
  const binCodes = new Set(binLocations.map((bin) => bin.BinCode))

  const existingByKey = new Map(
    existingProjectItems.map((projectItem) => [
      rowKey(projectItem.DistNumber!, projectItem.warehouseCode, projectItem.binCode, projectItem.projectIndividualCode),
      projectItem.id,
    ])
  )

  //* last row of a key wins, so one run never writes the same project item twice
  const reshaped = new Map<string, Prisma.ProjectItemUncheckedCreateInput>()

  for (const row of rows) {
    const itemCode = trimmed(row.ItemCode)
    const distNumber = trimmed(row.DistNumber)
    const warehouseCode = trimmed(row.WhsCode)
    const binCode = trimmed(row.BinCode)
    const projectIndividualCode = safeParseInt(row.U_ProjectID)

    if (!distNumber) {
      skip(`${String(distNumber)} - batch number does not exist`)
      continue
    }

    if (!itemCode || !itemCodeToCode.has(itemCode)) {
      skip(`${String(itemCode)} - item does not exist`)
      continue
    }

    if (!projectIndividualCode || !projectCodes.has(projectIndividualCode)) {
      skip(`${String(projectIndividualCode)} - project individual does not exist`)
      continue
    }

    //* warehouse and bin are foreign keys, an unknown one would fail the whole write
    if (warehouseCode && !warehouseCodes.has(warehouseCode)) {
      skip(`${String(warehouseCode)} - warehouse does not exist`)
      continue
    }

    if (binCode && !binCodes.has(binCode)) {
      skip(`${String(binCode)} - bin location does not exist`)
      continue
    }

    reshaped.set(rowKey(distNumber, warehouseCode, binCode, projectIndividualCode), {
      dbCode,
      itemCode: itemCodeToCode.get(itemCode)!,
      projectIndividualCode,
      DistNumber: distNumber,
      warehouseCode,
      binCode,
      siteLocation: warehouseCode,
      partNumber: trimmed(row.U_PartNumber),
      dateCode: trimmed(row.U_DateCode),
      countryOfOrigin: trimmed(row.MnfSerial),
      lotCode: trimmed(row.U_LotCode),
      packagingType: trimmed(row.U_PackagingType),
      spq: trimmed(row.U_SPQ),
      dateReceived: parseSapCompactDate(row.InDate),
      //* sap signs a delivery negative for stock going out, in IRIS the same movement is a move in
      totalStock: Math.abs(safeParseFloat(row.Quantity)),
      notes: trimmed(row.Notes),
      owner: trimmed(row.U_Owner),
      commodities: trimmed(row.U_Commodities),
      group: trimmed(row.U_Group),
      division: trimmed(row.U_Division),
      site: trimmed(row.U_Site),
      cmSite: trimmed(row.U_CMSite),
      phase: safeParseInt(row.U_Phase) || null,
      mfr: trimmed(row.FirmName),
      desc: trimmed(row.ItemName),
      syncStatus: 'synced',
    })
  }

  //! split instead of upsert — prisma leaves the compound unique out of the where input because warehouseCode and binCode are nullable
  const toCreate: Prisma.ProjectItemCreateManyInput[] = []
  const toUpdate: { id: string; data: Prisma.ProjectItemUncheckedUpdateInput }[] = []

  for (const [key, data] of reshaped) {
    const existingId = existingByKey.get(key)

    if (existingId) {
      //! only the sap owned fields — cost, prices, site location and stock in/out are edited in the portal and must survive a sync
      //! totalStock too, work orders credit and debit it in the portal, sap would overwrite those movements
      const { dbCode: _dbCode, DistNumber, warehouseCode, binCode, projectIndividualCode, totalStock, ...sapOwned } = data
      toUpdate.push({ id: existingId, data: { ...sapOwned, updatedBy: userId } })
      continue
    }

    toCreate.push({ ...data, createdBy: userId, updatedBy: userId })
  }

  //! chunk by chunk, not one big transaction — an interactive transaction times out after 5 seconds by default and a first sync is far longer
  for (const chunk of chunkArray(toCreate, WRITE_CHUNK_SIZE)) {
    await db.projectItem.createMany({ data: chunk })
  }

  //* the array form batches the whole chunk into one round trip
  for (const chunk of chunkArray(toUpdate, WRITE_CHUNK_SIZE)) {
    await db.$transaction(chunk.map((entry) => db.projectItem.update({ where: { id: entry.id }, data: entry.data })))
  }

  await db.syncMeta.upsert({
    where: { dbCode_code: { dbCode, code: PROJECT_ITEM_SYNC_META_CODE } },
    create: {
      dbCode,
      code: PROJECT_ITEM_SYNC_META_CODE,
      description: 'Last project item batch synced date',
      lastSyncAt: runStartedAt,
      createdBy: userId,
      updatedBy: userId,
    },
    update: { lastSyncAt: runStartedAt, updatedBy: userId },
  })

  const skipped = Object.values(skippedReasons).reduce((total, count) => total + count, 0)

  const result: ProjectItemSyncResult = {
    dbCode,
    fetched: rows.length,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped,
    skippedReasons,
    durationMs: Date.now() - startedAt,
  }

  logger.info({ ...result, trigger }, 'Project item sync finished')

  return result
}

//* one run across every active database, used by the cron
export async function syncProjectItemsForAllDatabases() {
  const databases = await db.sapDatabase.findMany({ where: { isActive: true }, select: { dbCode: true } })

  const results: ProjectItemSyncResult[] = []

  //! sequential on purpose — each database opens its own sap session and a parallel run burns licenses
  for (const database of databases) {
    try {
      results.push(await syncProjectItemsFromSap(database.dbCode, { trigger: 'cron' }))
    } catch (error) {
      logger.error({ dbCode: database.dbCode, error }, 'Project item sync failed')
    }
  }

  return results
}

export const projectItemSyncJob: Job = {
  code: PROJECT_ITEM_SYNC_JOB_CODE,
  description: 'Sync delivery batches into the iris portal project items',
  schedule: process.env.PROJECT_ITEM_SYNC_CRON || '*/30 * * * *',
  run: async () => {
    await syncProjectItemsForAllDatabases()
  },
}
