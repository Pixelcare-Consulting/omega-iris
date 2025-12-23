'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { isAfter, isSameDay, parse } from 'date-fns'

import { paramsSchema } from '@/schema/common'
import {
  BUSINESS_PARTNER_TYPE_MAP,
  BUSINESS_PARTNER_STD_API_VALUES_MAP,
  businessPartnerFormSchema,
  syncFromSapFormSchema,
  syncToSapFormSchema,
} from '@/schema/business-partner'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { safeParseFloat, safeParseInt } from '@/utils'
import logger from '@/utils/logger'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'

const COMMON_BUSINESS_PARTNER_ORDER_BY = { CardCode: 'asc' } satisfies Prisma.BusinessPartnerOrderByWithRelationInput

export async function getBps(cardType: string | string[], excludeCodes?: number[] | null) {
  try {
    const result = await db.businessPartner.findMany({
      where: {
        ...(typeof cardType === 'string' ? { CardType: cardType } : { CardType: { in: cardType } }),
        ...(excludeCodes?.length ? { code: { notIn: excludeCodes } } : {}),
      },
      orderBy: COMMON_BUSINESS_PARTNER_ORDER_BY,
    })

    const normalizeResult = result.map((bp) => ({
      ...bp,
      Balance: safeParseFloat(bp.Balance),
      ChecksBal: safeParseFloat(bp.ChecksBal),
    }))

    return normalizeResult as typeof normalizeResult
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBpsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardType: z.union([z.string(), z.array(z.string())]), excludeCodes: z.array(z.coerce.number()).nullish() }))
  .action(async ({ parsedInput: data }) => {
    return await getBps(data.cardType, data.excludeCodes)
  })

export async function getBpByCode(code: number) {
  if (!code) return null

  try {
    const result = await db.businessPartner.findUnique({ where: { code } })

    if (!result) return null

    const normalizedResult = {
      ...result,
      Balance: safeParseFloat(result.Balance),
      ChecksBal: safeParseFloat(result.ChecksBal),
    }

    return normalizedResult
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getBpByCardCode(cardCode: string) {
  if (!cardCode) return null

  try {
    const result = await db.businessPartner.findUnique({ where: { CardCode: cardCode } })

    if (!result) return null

    const normalizedResult = {
      ...result,
      Balance: safeParseFloat(result.Balance),
      ChecksBal: safeParseFloat(result.ChecksBal),
    }

    return normalizedResult
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertBp = action
  .use(authenticationMiddleware)
  .schema(businessPartnerFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    try {
      const existingBp = await db.businessPartner.findFirst({
        where: {
          CardCode: data.CardCode,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingBp) {
        return {
          error: true,
          status: 401,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} code already exists!`,
          action: 'UPSERT_BUSINESS_PARTNER',
        }
      }

      //* update bp
      if (code !== -1) {
        // TODO:  update bp contacts or addresses, if contacts and addresses will be saved in portal
        const updatedBp = await db.businessPartner.update({
          where: { code },
          data: { ...data, syncStatus: data?.syncStatus ?? 'pending', updatedBy: userId },
        })

        return {
          status: 200,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} updated successfully!`,
          action: 'UPSERT_BUSINESS_PARTNER',
          data: { businessPartner: updatedBp },
        }
      }

      //* create bp
      const newBp = await db.businessPartner.create({
        data: {
          ...data,
          syncStatus: data?.syncStatus ?? 'pending',
          createdBy: userId,
          updatedBy: userId,
        },
      })

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} created successfully!`,
        action: 'UPSERT_BUSINESS_PARTNER',
        data: { businessPartner: newBp },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_BUSINESS_PARTNER',
      }
    }
  })

export const deleteBp = action
  .use(authenticationMiddleware)
  .schema(paramsSchema.merge(z.object({ cardType: z.string() })))
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const bp = await db.businessPartner.findUnique({ where: { code: data.code } })

      if (!bp)
        return {
          error: true,
          status: 404,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.cardType]} not found!`,
          action: 'DELETE_BUSINESS_PARTNER',
        }

      await db.businessPartner.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[data.cardType]} deleted successfully!`,
        action: 'DELETE_BUSINESS_PARTNER',
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_BUSINESS_PARTNER',
      }
    }
  })

export const restoreBp = action
  .use(authenticationMiddleware)
  .schema(paramsSchema.merge(z.object({ cardType: z.string() })))
  .action(async ({ parsedInput: data }) => {
    try {
      const bp = await db.businessPartner.findUnique({ where: { code: data.code } })

      if (!bp) {
        return {
          error: true,
          status: 404,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.cardType]} not found!`,
          action: 'RESTORE_BUSINESS_PARTNER',
        }
      }

      await db.businessPartner.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[data.cardType]} restored successfully!`,
        action: 'RESTORE_BUSINESS_PARTNER',
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_BUSINESS_PARTNER',
      }
    }
  })

const PER_PAGE = 100

export async function getBpMaster(cardType?: string) {
  if (!cardType) return []

  try {
    const totalCount = await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/BusinessPartners/$count?$filter=U_Portal_Sync eq 'Y'` })
    const totalPage = Math.ceil(safeParseInt(totalCount) / PER_PAGE)

    const requestsPromises = []

    //* if card type is C or L, then fetch all C and L, otherwise fetch only the selected e.g S
    if (cardType === 'C' || cardType === 'L') {
      const ctypes = ['L', 'C']

      ctypes.forEach((cType) => {
        for (let i = 0; i <= totalPage; i++) {
          const skip = i * PER_PAGE //* offset

          //* create request
          const request = callSapServiceLayerApi({
            url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query1')/List?&$skip=${skip}`,
            headers: { Prefer: `odata.maxpagesize=${PER_PAGE}` },
            data: { ParamList: `CardType='${cType}'` },
          })

          //* push request to the requestsPromises array
          requestsPromises.push(request)
        }
      })
    } else {
      for (let i = 0; i <= totalPage; i++) {
        const skip = i * PER_PAGE //* offset

        //* create request
        const request = callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query1')/List?&$skip=${skip}`,
          headers: { Prefer: `odata.maxpagesize=${PER_PAGE}` },
          data: { ParamList: `CardType='${cardType}'` },
        })

        //* push request to the requestsPromises array
        requestsPromises.push(request)
      }
    }

    //* fetch all bp master from sap in parallel
    const bpMaster = await Promise.all(requestsPromises)

    return bpMaster
      .flatMap((res) => res?.value || [])
      .filter(Boolean)
      .sort((a, b) => a?.CardCode - b?.CardCode)
  } catch (error) {
    console.log({ error })
    logger.error(error, 'Failed to fetch bp master from SAP')
    return []
  }
}

export const syncToSap = action
  .use(authenticationMiddleware)
  .schema(syncToSapFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { bps, cardType } = parsedInput
    const { userId } = ctx

    const importSyncErrors: ImportSyncError[] = []
    const toUpdateSyncStatus: number[] = []

    try {
      const sapBatch: { rowNumber: number; code: number; promise: Promise<any>; row: Record<string, any> }[] = []

      for (let i = 0; i < bps.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = bps[i]
        const rowNumber = i + 1

        //* check required fields
        if (!row?.CardCode) errors.push({ field: 'Code', message: 'Missing required fields' })

        if (!row?.CardName) errors.push({ field: 'Name', message: 'Missing required fields' })

        if (!row?.CardType) errors.push({ field: 'Type', message: 'Missing required fields' })

        //* if errors array is not empty, then update/push to ImportSyncError
        if (errors.length > 0) {
          importSyncErrors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        const toCreate = {
          CardCode: row?.CardCode,
          CardName: row?.CardName,
          CardType: BUSINESS_PARTNER_STD_API_VALUES_MAP?.[row?.CardType as string] || 'cLid',
          GroupCode: row?.GroupCode || null,
          PayTermsGrpCode: row?.GroupNum || null,
          Currency: row?.CurrCode || null,
          Phone1: row?.Phone1 || null,
          U_OMEG_AcctType: row?.AcctType || null,
          CurrentAccountBalance: row?.Balance || null,
          OpenChecksBalance: row?.ChecksBal || null,
          U_Portal_Sync: 'Y',
        }

        sapBatch.push({
          rowNumber,
          code: row?.code,
          promise: callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/BusinessPartners`, method: 'post', data: toCreate }),
          row,
        })
      }

      //* create items into sap
      const sapCreated = await Promise.all(sapBatch.map((b) => b.promise))

      //* populate error if any related to sap
      for (let i = 0; i < sapCreated.length; i++) {
        const batchItem = sapBatch[i] //* sapCreated and sapBatch has the same order

        //* if error present means there's error when creating in sap
        if (sapCreated[i].error) {
          //* find the import error related to the batch items code
          const importError = importSyncErrors.find((e) => e?.code === batchItem?.code)

          //* update the error if there existing import error otherwise create a new one
          if (importError) {
            importError.entries.push({
              field: 'SAP Error',
              message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error',
            })
          } else {
            importSyncErrors.push({
              rowNumber: batchItem.rowNumber,
              entries: [{ field: 'SAP Error', message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error' }],
              row: batchItem.row,
              code: batchItem.code,
            })
          }

          continue
        }

        //* add code to the toUpdateSyncStatus array, only the code will be added that does not encountered any error in sap creation
        toUpdateSyncStatus.push(batchItem.code)
      }

      //* update the sync status of the bp who created in sap
      await db.businessPartner.updateMany({
        where: { code: { in: toUpdateSyncStatus } },
        data: { syncStatus: 'synced', updatedBy: userId },
      })

      const completed = sapCreated?.filter((sc) => !sc?.error)

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[cardType]} sync successfully!. ${completed.length}/${bps.length} ${BUSINESS_PARTNER_TYPE_MAP[cardType].toLowerCase()} created into SAP. ${importSyncErrors.length} errors found.`,
        action: 'SYNC_TO_SAP',
        errors: importSyncErrors,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = bps.map((row, index) => ({
        rowNumber: index + 1,
        code: row.code,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row,
      }))

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'SYNC_TO_SAP',
        errors,
      }
    }
  })

export const syncFromSap = action
  .use(authenticationMiddleware)
  .schema(syncFromSapFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { userId } = ctx

    const SYNC_META_CODE = BUSINESS_PARTNER_TYPE_MAP[parsedInput.cardType].toLowerCase()

    try {
      //* fetch all bp master from sap & last sync date
      const data = await Promise.allSettled([
        getBpMaster(parsedInput.cardType),
        db.syncMeta.findUnique({ where: { code: SYNC_META_CODE } }),
      ])

      const bpMaster = data[0].status === 'fulfilled' ? data[0]?.value || [] : []
      const lastSyncDate = data[1].status === 'fulfilled' ? data[1]?.value?.lastSyncAt || new Date('01/01/2020') : new Date('01/01/2020')

      if (bpMaster.length < 1) {
        return {
          error: true,
          status: 404,
          message: 'Failed to fetch bp master from SAP!',
          action: 'SYNC_FROM_SAP',
        }
      }

      //* do an upsert operation
      //*  filter the records where CreatedDate === lastSyncDate or  CreateDate > lastSyncDate or UpdateDate === lastSyncDate or UpdateDate > lastSyncDate
      const filteredSapBpMasters =
        bpMaster?.filter((row: any) => {
          const createDate = row?.CreateDate ? parse(row?.CreateDate, 'yyyyMMdd', new Date()) : null
          const updateDate = row?.UpdateDate ? parse(row?.UpdateDate, 'yyyyMMdd', new Date()) : null

          const isCreateDateSameDay = createDate ? isSameDay(createDate, lastSyncDate) : false
          const isUpdateDateSameDay = updateDate ? isSameDay(updateDate, lastSyncDate) : false
          const isCreateDateAfter = createDate ? isAfter(createDate, lastSyncDate) : false
          const isUpdateDateAfter = updateDate ? isAfter(updateDate, lastSyncDate) : false

          return isCreateDateSameDay || isUpdateDateSameDay || isCreateDateAfter || isUpdateDateAfter
        }) || []

      const getUpsertPromises = (values: Record<string, any>[], tx: any) => {
        //* filtered bps by U_Portal_Sync === Y

        return values
          .filter((row: any) => row?.U_Portal_Sync === 'Y')
          .map((row: any) => {
            if (!row?.['CardCode']) return null

            const bpData = {
              syncStatus: 'synced',
              createdBy: userId,
              updatedBy: userId,

              //* sap fields
              CardCode: row?.CardCode,
              CardName: row?.CardName,
              CardType: row?.CardType,
              CurrName: row?.CurrName || null,
              CurrCode: row?.Currency || null,
              GroupCode: row?.GroupCode || null,
              GroupName: row?.GroupName || null,
              GroupNum: row?.GroupNum || null,
              PymntGroup: row?.PymntGroup || null,
              Phone1: row?.Phone1 || null,
              AcctType: row?.U_OMEG_AcctType || null,
              Balance: row?.Balance || null,
              ChecksBal: row?.ChecksBal || null,
            }

            return tx.businessPartner.upsert({
              where: { CardCode: bpData.CardCode },
              create: bpData,
              update: bpData,
            })
          })
          .filter((row) => row !== null)
      }

      //* perform upsert and  update the sync meta
      await db.$transaction(async (tx) => {
        //* upsert items
        await Promise.all(getUpsertPromises(filteredSapBpMasters, tx))

        //* upsert sync meta
        await tx.syncMeta.upsert({
          where: { code: SYNC_META_CODE },
          create: { code: SYNC_META_CODE, description: 'Last bp customer master synced date', lastSyncAt: new Date() },
          update: { code: SYNC_META_CODE, description: 'Last bp customer master synced date', lastSyncAt: new Date() },
        })
      })

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[parsedInput.cardType]} sync successfully!`,
        action: 'SYNC_FROM_SAP',
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'SYNC_FROM_SAP',
      }
    }
  })
