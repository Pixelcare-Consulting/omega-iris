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
  ADDRESS_TYPE_STD_API_MAP,
  BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP,
} from '@/schema/business-partner'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { chunkArray, safeParseFloat, safeParseInt } from '@/utils'
import logger from '@/utils/logger'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { getAddresses, getMasterAddresses } from './address'
import { getContacts, getMasterContacts } from './contact'
import { importFormSchema } from '@/schema/import'

const COMMON_BUSINESS_PARTNER_ORDER_BY = { CardCode: 'asc' } satisfies Prisma.BusinessPartnerOrderByWithRelationInput

export async function getBps(cardType: string | string[], isSynced?: boolean | null, excludeCodes?: number[] | null) {
  try {
    return db.businessPartner.findMany({
      where: {
        ...(typeof cardType === 'string' ? { CardType: cardType } : { CardType: { in: cardType } }),
        ...(excludeCodes?.length ? { code: { notIn: excludeCodes } } : {}),
        ...(isSynced ? { syncStatus: 'synced' } : {}),
      },
      orderBy: COMMON_BUSINESS_PARTNER_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBpsClient = action
  .use(authenticationMiddleware)
  .schema(
    z.object({
      cardType: z.union([z.string(), z.array(z.string())]),
      isSynced: z.boolean().nullish(),
      excludeCodes: z.array(z.coerce.number()).nullish(),
    })
  )
  .action(async ({ parsedInput: data }) => {
    return getBps(data.cardType, data.isSynced, data.excludeCodes)
  })

export async function getBpByCode(code: number) {
  if (!code) return null

  try {
    return db.businessPartner.findUnique({ where: { code } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getBpByCardCode(cardCode: string) {
  if (!cardCode) return null

  try {
    return db.businessPartner.findUnique({ where: { CardCode: cardCode } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertBp = action
  .use(authenticationMiddleware)
  .schema(businessPartnerFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, contacts, billingAddresses, shippingAddresses, ...data } = parsedInput
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
        const updatedBp = await db.$transaction(async (tx) => {
          const bp = await db.businessPartner.update({
            where: { code },
            data: { ...data, syncStatus: data?.syncStatus ?? 'pending', updatedBy: userId },
            select: { CardCode: true, addresses: true, contacts: true, code: true },
          })

          const currentBillingAddresses = bp.addresses.filter((a) => a.AddrType === 'B').map((a) => a.id)
          const currentShippingAddresses = bp.addresses.filter((a) => a.AddrType === 'S').map((a) => a.id)
          const currentContacts = bp.contacts.map((c) => c.id)

          const toDeleteContacts = currentContacts.filter((ccId) => {
            const contactIds = contacts.map((c) => c.id).filter((cid) => cid !== 'add')
            return !contactIds.includes(ccId)
          })

          const toDeleteBillingAddresses = currentBillingAddresses.filter((cba) => {
            const baIds = billingAddresses.map((ba) => ba.id).filter((baId) => baId !== 'add')
            return !baIds.includes(cba)
          })

          const toDeleteShippingAddresses = currentShippingAddresses.filter((csa) => {
            const saIds = shippingAddresses.map((sa) => sa.id).filter((saId) => saId !== 'add')
            return !saIds.includes(csa)
          })

          //* upsert contacts in sequence
          if (contacts.length > 0) {
            for (const { id, ...c } of contacts) {
              await tx.contact.upsert({
                where: { id },
                create: { ...c, CardCode: bp.CardCode, createdBy: userId, updatedBy: userId },
                update: { ...c, CardCode: bp.CardCode, updatedBy: userId },
              })
            }
          }

          //* upsert billing addresses in sequence
          if (billingAddresses.length > 0) {
            for (const { id, ...ba } of billingAddresses) {
              await tx.address.upsert({
                where: { id, AddrType: 'B' },
                create: {
                  ...ba,
                  CardCode: bp.CardCode,
                  createdBy: userId,
                  updatedBy: userId,
                },
                update: {
                  ...ba,
                  CardCode: bp.CardCode,
                  updatedBy: userId,
                },
              })
            }
          }

          //* upsert shipping addresses in sequence
          if (shippingAddresses.length > 0) {
            for (const { id, ...sa } of shippingAddresses) {
              await tx.address.upsert({
                where: { id, AddrType: 'S' },
                create: {
                  ...sa,
                  CardCode: bp.CardCode,
                  createdBy: userId,
                  updatedBy: userId,
                },
                update: {
                  ...sa,
                  CardCode: bp.CardCode,
                  updatedBy: userId,
                },
              })
            }
          }

          await Promise.all([
            //* delete contacts that are not in the current list, means they are deleted or to be deleted
            db.contact.deleteMany({ where: { id: { in: toDeleteContacts } } }),

            //* delete billing addresses that are not in the current list, means they are deleted or to be deleted
            db.address.deleteMany({ where: { id: { in: toDeleteBillingAddresses } } }),

            //* delete shipping addresses that are not in the current list, means they are deleted or to be deleted
            db.address.deleteMany({ where: { id: { in: toDeleteShippingAddresses } } }),
          ])

          return bp
        })

        return {
          status: 200,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} updated successfully!`,
          action: 'UPSERT_BUSINESS_PARTNER',
          data: { businessPartner: updatedBp },
        }
      }

      //* create bp
      const newBp = await db.$transaction(async (tx) => {
        const bp = await tx.businessPartner.create({
          data: {
            ...data,
            CardCode: data?.CardCode?.trim(),
            syncStatus: data?.syncStatus ?? 'pending',
            createdBy: userId,
            updatedBy: userId,
          },
        })

        //* upsert contacts in sequence
        if (contacts.length > 0) {
          for (const { id, ...c } of contacts) {
            await tx.contact.upsert({
              where: { id },
              create: { ...c, CardCode: bp.CardCode, createdBy: userId, updatedBy: userId },
              update: { ...c, CardCode: bp.CardCode, updatedBy: userId },
            })
          }
        }

        //* upsert billing addresses in sequence
        if (billingAddresses.length > 0) {
          for (const { id, ...ba } of billingAddresses) {
            await tx.address.upsert({
              where: { id, AddrType: 'B' },
              create: {
                ...ba,
                CardCode: bp.CardCode,
                createdBy: userId,
                updatedBy: userId,
              },
              update: {
                ...ba,
                CardCode: bp.CardCode,
                updatedBy: userId,
              },
            })
          }
        }

        //* upsert shipping addresses in sequence
        if (shippingAddresses.length > 0) {
          for (const { id, ...sa } of shippingAddresses) {
            await tx.address.upsert({
              where: { id, AddrType: 'S' },
              create: {
                ...sa,
                CardCode: bp.CardCode,
                createdBy: userId,
                updatedBy: userId,
              },
              update: {
                ...sa,
                CardCode: bp.CardCode,
                updatedBy: userId,
              },
            })
          }
        }

        return bp
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

export const importBp = action
  .use(authenticationMiddleware)
  .schema(importFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow, metaData } = parsedInput
    const { userId } = ctx

    const bpGroups = metaData?.bpGroups || []
    const currencies = metaData?.currencies || []
    const paymentTerms = metaData?.paymentTerms || []
    const accountTypes = metaData?.accountTypes || []
    const businessTypes = metaData?.businessTypes || []

    const cardType = metaData?.cardType || 'L'
    const bpGroupType = BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP[cardType] || 'bbpgt_CustomerGroup'

    const cardCodes = data?.map((row) => row?.['Code'])?.filter(Boolean) || []

    try {
      const batch: Prisma.BusinessPartnerCreateManyInput[] = []
      const toBeCreatedCardCode: string[] = [] //* contains toBeCreated business partner code

      //* get existing bps card cades
      const existingBpsCardCodes = await db.businessPartner
        .findMany({ where: { CardCode: { in: cardCodes } }, select: { CardCode: true } })
        .then((bps) => bps.map((bp) => bp.CardCode))

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const group = bpGroups?.filter((g: any) => g?.Type === bpGroupType)?.find((g: any) => g?.Code == row?.['Group'])
        const currency = currencies?.find((c: any) => c?.CurrCode == row?.['Currency'])
        const paymentTerm = paymentTerms?.find((pt: any) => pt?.GroupNum == row?.['Payment_Terms'])
        const accountType = accountTypes?.find((at: any) => at?.Code == row?.['Account_Type'])
        const businessType = businessTypes?.find((bt: any) => bt?.Code == row?.['Type_Of_Business'])

        //* check required fields
        if (!row?.['Name']) errors.push({ field: 'Name', message: 'Missing required field' })

        //* check if code is provided, check if it is already exist
        if (existingBpsCardCodes.includes(row?.['Code']) || toBeCreatedCardCode.includes(row?.['Code'])) {
          errors.push({ field: 'Code', message: 'Code already exists' })
        }

        //* if errors array is not empty, then update/push to ImportSyncError
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* add to be created business partner codes
        toBeCreatedCardCode.push(row['Code'])

        //* reshape data
        const toCreate: Prisma.BusinessPartnerCreateManyInput = {
          CardCode: row?.['Code'] ? row?.['Code']?.trim() : `BP-${Date.now()}`,
          CardName: row?.['Name'] || null,
          CardType: cardType,
          CurrName: currency?.CurrName || null,
          CurrCode: currency?.CurrCode || null,
          GroupCode: group?.Code || null,
          GroupName: group?.Name || null,
          GroupNum: paymentTerm?.GroupNum || null,
          PymntGroup: paymentTerm?.PymntGroup || null,
          AcctType: accountType?.Code || null,
          CmpPrivate: businessType?.Code || null,
          isActive: row?.['Active'] === '1' ? true : !row?.['Active'] ? undefined : false,
          Phone1: row?.['Phone_1'] || null,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.businessPartner.createMany({
        data: batch,
        skipDuplicates: true,
      })

      const progress = ((stats.completed + batch.length) / total) * 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + batch.length,
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      return {
        status: 200,
        message: `${updatedStats.completed} ${BUSINESS_PARTNER_TYPE_MAP[cardType]} created successfully!`,
        action: 'IMPORT_BUSINESS_PARTNERS',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data import error:', error)

      const errors = data.map((row) => ({
        rowNumber: row.rowNumber as number,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row: null,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'IMPORT_BUSINESS_PARTNERS',
        stats,
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
      for (let i = 0; i <= totalPage; i++) {
        const skip = i * PER_PAGE //* offset

        //* create request
        const request = callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query1')/List?&$skip=${skip}`,
          headers: { Prefer: `odata.maxpagesize=${PER_PAGE}` },
          data: { ParamList: "CardTypeFrom='C'&CardTypeTo='L'&CardCodeFrom=''&CardCodeTo=''" },
        })

        //* push request to the requestsPromises array
        requestsPromises.push(request)
      }
    } else {
      for (let i = 0; i <= totalPage; i++) {
        const skip = i * PER_PAGE //* offset

        //* create request
        const request = callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query1')/List?&$skip=${skip}`,
          headers: { Prefer: `odata.maxpagesize=${PER_PAGE}` },
          data: { ParamList: `CardTypeFrom='${cardType}'&CardTypeTo='${cardType}'&CardCodeFrom=''&CardCodeTo=''` },
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
        if (!row?.CardCode) errors.push({ field: 'Code', message: 'Missing required field' })

        if (!row?.CardName) errors.push({ field: 'Name', message: 'Missing required field' })

        if (!row?.CardType) errors.push({ field: 'Type', message: 'Missing required field' })

        //* if errors array is not empty, then update/push to ImportSyncError
        if (errors.length > 0) {
          importSyncErrors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        //* fetch address and contacts
        const [addresses, contacts] = await Promise.all([getAddresses(row?.CardCode ?? ''), getContacts(row?.CardCode ?? '')])

        const toCreateAddresses = addresses.map((addr) => ({
          AddressName: addr?.AddressName,
          Street: addr?.Street || null,
          Block: addr?.Block || null,
          ZipCode: addr?.ZipCode || null,
          City: addr?.City || null,
          County: addr?.County || null,
          Country: addr?.CountryCode || null,
          State: addr?.StateCode || null,
          BuildingFloorRoom: addr?.BuildingFloorRoom || null,
          AddressType: ADDRESS_TYPE_STD_API_MAP?.[addr?.AddrType] || 'bo_ShipTo',
          AddressName2: addr?.Address2 || null,
          AddressName3: addr?.Address3 || null,
          StreetNo: addr?.StreetNo || null,
          GlobalLocationNumber: addr?.GlobalLocationNumber || null,
        }))

        const toCreateContacts = contacts.map((contct) => ({
          Name: contct?.ContactName,
          Position: contct?.Position || null,
          Phone1: contct?.Phone1 || null,
          Phone2: contct?.Phone2 || null,
          MobilePhone: contct?.MobilePhone || null,
          E_Mail: contct?.Email || null,
          Title: contct?.Title || null,
          FirstName: contct?.FirstName || null,
          LastName: contct?.LastName || null,
        }))

        const toCreate = {
          CardCode: row?.CardCode,
          CardName: row?.CardName,
          CardType: BUSINESS_PARTNER_STD_API_VALUES_MAP?.[row?.CardType as string] || 'cLid',
          GroupCode: row?.GroupCode || null,
          PayTermsGrpCode: row?.GroupNum || null,
          Currency: row?.CurrCode || null,
          Phone1: row?.Phone1 || null,
          U_OMEG_AcctType: row?.AcctType || null,
          BusinessType: row?.CmpPrivate || null,
          U_Portal_Sync: 'Y',
          BPAddresses: toCreateAddresses,
          ContactEmployees: toCreateContacts,
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

      const allowedBps = filteredSapBpMasters.filter((row) => row?.U_Portal_Sync === 'Y')

      const [bpAddreses, bpContacts] = await Promise.all([
        Promise.all(allowedBps.map((bp) => getMasterAddresses(bp?.CardCode ?? ''))),
        Promise.all(allowedBps.map((bp) => getMasterContacts(bp?.CardCode ?? ''))),
      ])

      const addressMap = new Map<string, any[]>()
      const contactMap = new Map<string, any[]>()

      allowedBps.forEach((bp, index) => {
        addressMap.set(bp.CardCode, bpAddreses[index]?.value ?? [])
        contactMap.set(bp.CardCode, bpContacts[index]?.value ?? [])
      })

      const getBpUpsertPromises = (chunks: Record<string, any>[], tx: any) => {
        return chunks
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
              CmpPrivate: row?.CmpPrivate || null,
            }

            return tx.businessPartner.upsert({
              where: { CardCode: bpData.CardCode },
              create: bpData,
              update: bpData,
            })
          })
          .filter((row) => row !== null)
      }

      const upsertAddresses = async (chunks: Record<string, any>[], tx: any) => {
        for (const bp of chunks) {
          //* fetch bp from sap
          const bpAddresses = addressMap.get(bp.CardCode) ?? []

          const bpAddressesData = bpAddresses?.map((addr: any) => ({
            CardCode: bp?.CardCode,
            AddressName: addr?.Address || null,
            AddrType: addr?.AdresType || 'S',
            Street: addr?.Street || null,
            Address2: addr?.Address2 || null,
            Address3: addr?.Address3 || null,
            StreetNo: addr?.StreetNo || null,
            BuildingFloorRoom: addr?.Building || null,
            Block: addr?.Block || null,
            City: addr?.City || null,
            ZipCode: addr?.ZipCode || null,
            County: addr?.County || null,
            CountryCode: addr?.Country || null,
            CountryName: addr?.CountryName || null,
            StateCode: addr?.State || null,
            StateName: addr?.StateName || null,
            GlobalLocationNumber: addr?.GlblLocNum || null,
          }))

          //* upsert address in sequence
          //TODO: examine performance issues
          if (bpAddressesData.length > 0) {
            for (const addr of bpAddressesData) {
              await tx.address.upsert({
                where: {
                  CardCode_AddressName_AddrType: {
                    CardCode: bp.CardCode,
                    AddressName: addr?.AddressName || '',
                    AddrType: addr?.AddrType,
                  },
                },
                create: {
                  ...addr,
                  createdBy: userId,
                  updatedBy: userId,
                },
                update: {
                  ...addr,
                  updatedBy: userId,
                },
              })
            }
          }
        }
      }

      const upsertContacts = async (chunks: Record<string, any>[], tx: any) => {
        for (const bp of chunks) {
          //* fetch bp from sap
          const bpContacts = contactMap.get(bp.CardCode) ?? []

          const bpContactsData = bpContacts?.map((contct: any) => ({
            CardCode: bp?.CardCode,
            ContactName: contct?.ContactID || null,
            FirstName: contct?.FirstName || null,
            LastName: contct?.LastName || null,
            Title: contct?.Title || null,
            Position: contct?.Position || null,
            Phone1: contct?.Tel1 || null,
            Phone2: contct?.Tel2 || null,
            MobilePhone: contct?.Cellolar || null,
            Email: contct?.E_MailL || null,
          }))

          //* upsert contacts in sequence
          //TODO: examine performance issues
          if (bpContactsData.length > 0) {
            for (const contact of bpContactsData) {
              await tx.contact.upsert({
                where: {
                  CardCode_ContactName: {
                    CardCode: bp.CardCode,
                    ContactName: contact?.ContactName || '',
                  },
                },
                create: {
                  ...contact,
                  createdBy: userId,
                  updatedBy: userId,
                },
                update: {
                  ...contact,
                  updatedBy: userId,
                },
              })
            }
          }
        }
      }

      //* chunk transactions
      const chunks = chunkArray(allowedBps, 10)

      for (const chunk of chunks) {
        await db.$transaction(async (tx) => {
          await Promise.all(getBpUpsertPromises(chunk, tx))
          await upsertAddresses(chunk, tx)
          await upsertContacts(chunk, tx)
        })
      }

      //* upsert sync meta
      await db.syncMeta.upsert({
        where: { code: SYNC_META_CODE },
        create: { code: SYNC_META_CODE, description: 'Last bp customer master synced date', lastSyncAt: new Date() },
        update: { code: SYNC_META_CODE, description: 'Last bp customer master synced date', lastSyncAt: new Date() },
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
