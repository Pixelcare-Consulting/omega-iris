'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'
import { format, isAfter, isSameDay, parse } from 'date-fns'

import { paramsSchema } from '@/schema/common'
import {
  BUSINESS_PARTNER_TYPE_MAP,
  BUSINESS_PARTNER_STD_API_VALUES_MAP,
  businessPartnerFormSchema,
  syncToSapFormSchema,
  ADDRESS_TYPE_STD_API_MAP,
  BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP,
} from '@/schema/business-partner'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { safeParseInt } from '@/utils'
import logger from '@/utils/logger'
import { callSapServiceLayerApi } from './sap-service-layer'
import { BP_MASTER_MAX_PAGE_SIZE, SAP_BASE_URL } from '@/constants/sap'
import { DuplicateFields, ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import { getAddresses, getMasterAddresses } from './address'
import { getContacts, getMasterContacts } from './contact'
import { importFormSchema } from '@/schema/import'
import { createNotification } from './notification'
import { PERMISSIONS_CODES } from '@/constants/permission'

import { randomBytes } from 'crypto'
import { capitalize } from 'radash'
import { combineSapDateTime } from '@/utils/sap'

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

    const trimmedCardCode = data?.CardCode?.trim()
    const trimmedCardName = data?.CardName?.trim()

    try {
      const [existingCardCode, existingCardName] = await Promise.all([
        db.businessPartner.findFirst({ where: { CardCode: trimmedCardCode, ...(code && code !== -1 && { code: { not: code } }) } }),
        db.businessPartner.findFirst({ where: { CardName: trimmedCardName, ...(code && code !== -1 && { code: { not: code } }) } }),
      ])

      const duplicates: DuplicateFields = []

      if(existingCardCode) duplicates.push({ field: 'CardCode', name: 'Code',  message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} code already exists!` }) // prettier-ignore
      if(existingCardName) duplicates.push({ field: 'CardName', name: 'Name', message: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} name already exists!` }) // prettier-ignore

      if (duplicates.length > 0) {
        const paths = duplicates.map((d) => ({ field: d.field, message: d.message }))
        const message = duplicates.map((d) => d.name).join(', ')
        return { error: true, status: 401, message: `${capitalize(message)} already exists!`, action: 'UPSERT_BUSINESS_PARTNER', paths }
      }

      //* update bp
      if (code !== -1) {
        const updatedBp = await db.$transaction(async (tx) => {
          const bp = await db.businessPartner.update({
            where: { code },
            data: { ...data, syncStatus: data?.syncStatus ?? 'pending', updatedBy: userId },
            select: { id: true, CardCode: true, addresses: true, contacts: true, code: true },
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

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: data.CardType === 'L' || data.CardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
        //   title: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} Updated`,
        //   message: `A ${BUSINESS_PARTNER_TYPE_MAP[data.CardType].toLowerCase()} (#${updatedBp.code}) was updated by ${ctx.fullName}.`,
        //   link: `/${data.CardType === 'L' || data.CardType === 'C' ? 'customers' : 'suppliers'}/${updatedBp.code}/view`,
        //   entityType: 'BusinessPartner' as Prisma.ModelName,
        //   entityCode: updatedBp.code,
        //   entityId: updatedBp.id,
        //   userCodes: [],
        // })

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
            CardCode: trimmedCardCode,
            CardName: trimmedCardName,
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

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: data.CardType === 'L' || data.CardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
      //   title: `${BUSINESS_PARTNER_TYPE_MAP[data.CardType]} Created`,
      //   message: `A new ${BUSINESS_PARTNER_TYPE_MAP[data.CardType].toLowerCase()} (#${newBp.code}) was created by ${ctx.fullName}.`,
      //   link: `/${data.CardType === 'L' || data.CardType === 'C' ? 'customers' : 'suppliers'}/${newBp.code}/view`,
      //   entityType: 'BusinessPartner' as Prisma.ModelName,
      //   entityCode: newBp.code,
      //   entityId: newBp.id,
      //   userCodes: [],
      // })

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

    const cardCodes = data?.map((row) => row?.['Code']?.trim())?.filter(Boolean) || []
    const cardNames = data?.map((row) => row?.['Name']?.trim())?.filter(Boolean) || []

    try {
      const batch: Prisma.BusinessPartnerCreateManyInput[] = []
      const toBeCreatedCardCode: string[] = [] //* contains toBeCreated business partner code
      const toBeCreatedCardName: string[] = [] //* contains toBeCreated business partner name

      //* get existing bps card cades, names
      const [BpsCardCodes, BpsCardNames] = await Promise.all([
        db.businessPartner.findMany({ where: { CardCode: { in: cardCodes } }, select: { CardCode: true } }),
        db.businessPartner.findMany({ where: { CardName: { in: cardNames } }, select: { CardName: true } }),
      ])

      const existingBpsCardCodes = BpsCardCodes.map((bp) => bp.CardCode)
      const existingBpsCardNames = BpsCardNames.map((bp) => bp.CardName)

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        const trimmedCardCode = row?.['Code']?.trim()
        const trimmedCardName = row?.['Name']?.trim()

        const group = bpGroups?.filter((g: any) => g?.Type === bpGroupType)?.find((g: any) => g?.Code == row?.['Group'])
        const currency = currencies?.find((c: any) => c?.CurrCode == row?.['Currency'])
        const paymentTerm = paymentTerms?.find((pt: any) => pt?.GroupNum == row?.['Payment_Terms'])
        const accountType = accountTypes?.find((at: any) => at?.Code == row?.['Account_Type'])
        const businessType = businessTypes?.find((bt: any) => bt?.Code == row?.['Type_Of_Business'])

        //* check required fields
        if (!trimmedCardCode) errors.push({ field: 'Code', message: 'Missing required field' })
        if (!trimmedCardName) errors.push({ field: 'Name', message: 'Missing required field' })

        //* check if code is provided, check if it is already exist
        if (existingBpsCardCodes.includes(trimmedCardCode) || toBeCreatedCardCode.includes(trimmedCardCode)) {
          errors.push({ field: 'Code', message: 'Code already exists' })
        }

        //* check if name is provided, check if it is already exist
        if (existingBpsCardNames.includes(trimmedCardName) || toBeCreatedCardName.includes(trimmedCardName)) {
          errors.push({ field: 'Name', message: 'Name already exists' })
        }

        //* if errors array is not empty, then update/push to ImportSyncError
        if (errors.length > 0) {
          stats.errors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* add to be created business partner codes
        toBeCreatedCardCode.push(trimmedCardCode)

        //* add to be created business partner names
        toBeCreatedCardName.push(trimmedCardName)

        //* reshape data
        const toCreate: Prisma.BusinessPartnerCreateManyInput = {
          CardCode: trimmedCardCode ? trimmedCardCode : `BP-${Date.now()}`,
          CardName: trimmedCardName || null,
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

      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + batch.length, //* only rows actually created
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      if (updatedStats.status === 'completed') {
        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: cardType === 'C' || cardType === 'L' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
        //   title: `${BUSINESS_PARTNER_TYPE_MAP[cardType]} Imported`,
        //   message: `New ${BUSINESS_PARTNER_TYPE_MAP[cardType].toLowerCase()}${total > 1 ? 's were' : ' was'} imported by ${ctx.fullName}.`,
        //   link: `/${cardType === 'L' || cardType === 'C' ? 'customers' : 'suppliers'}`,
        //   entityType: 'BusinessPartner' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} ${BUSINESS_PARTNER_TYPE_MAP[cardType]} created successfully!`,
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
    function generateDeletedCardCode(code: string) {
      const suffix = randomBytes(4).toString('hex').toUpperCase() //* 8 chars
      return `DEL-${code}-${suffix}`
    }

    try {
      const bp = await db.businessPartner.findUnique({ where: { code: data.code } })

      if (!bp)
        return {
          error: true,
          status: 404,
          message: `${BUSINESS_PARTNER_TYPE_MAP[data.cardType]} not found!`,
          action: 'DELETE_BUSINESS_PARTNER',
        }

      //* modify also the card code of the bp so that auto generate card code will still be able to be assign to new bp if it still be available
      await db.businessPartner.update({
        where: { code: data.code },
        data: { CardCode: generateDeletedCardCode(bp.CardCode), deletedAt: new Date(), deletedBy: ctx.userId },
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: bp.CardType === 'L' || bp.CardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
      //   title: `${BUSINESS_PARTNER_TYPE_MAP[bp.CardType]} Deleted`,
      //   message: `A ${BUSINESS_PARTNER_TYPE_MAP[bp.CardType].toLowerCase()} (#${bp.code}) was deleted by ${ctx.fullName}.`,
      //   link: `/${bp.CardType === 'L' || bp.CardType === 'C' ? 'customers' : 'suppliers'}/${bp.code}/view`,
      //   entityType: 'BusinessPartner' as Prisma.ModelName,
      //   entityCode: bp.code,
      //   entityId: bp.id,
      //   userCodes: [],
      // })

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
  .action(async ({ ctx, parsedInput: data }) => {
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

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: bp.CardType === 'L' || bp.CardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
      //   title: `${BUSINESS_PARTNER_TYPE_MAP[bp.CardType]} Restored`,
      //   message: `A ${BUSINESS_PARTNER_TYPE_MAP[bp.CardType].toLowerCase()} (#${bp.code}) was restored by ${ctx.fullName}.`,
      //   link: `/${bp.CardType === 'L' || bp.CardType === 'C' ? 'customers' : 'suppliers'}/${bp.code}/view`,
      //   entityType: 'BusinessPartner' as Prisma.ModelName,
      //   entityCode: bp.code,
      //   entityId: bp.id,
      //   userCodes: [],
      // })

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

export async function getBpMasterCount(cardType: string) {
  try {
    //* must mirror getBpMasterByPage's card type filter, otherwise the page count is derived from a different population
    const cardTypeFilter =
      cardType === 'C' || cardType === 'L'
        ? `(CardType eq 'cCustomer' or CardType eq 'cLid')`
        : `(CardType eq '${BUSINESS_PARTNER_STD_API_VALUES_MAP[cardType] || 'cLid'}')`

    const totalCount = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/BusinessPartners/$count?$filter=${cardTypeFilter} and U_Portal_Sync eq 'Y'`,
    })

    return safeParseInt(totalCount)
  } catch (error) {
    console.log(error, `Failed to fetch bp master count from SAP: Card Type (${cardType})`)
    return 0
  }
}

export async function getBpMasterByPage(cardType: string, page: number) {
  try {
    const skip = page * BP_MASTER_MAX_PAGE_SIZE //* offset
    let value: any[] = []

    //* if card type is C or L, then fetch all C and L, otherwise fetch only the selected e.g S
    if (cardType === 'C' || cardType === 'L') {
      //* create request
      const request = (await callSapServiceLayerApi({
        url: `${SAP_BASE_URL}/b1s/v1/$crossjoin(BusinessPartners,BusinessPartnerGroups,PaymentTermsTypes,Currencies)?$expand=BusinessPartners($select=CardCode,CardName,CardType,GroupCode,PayTermsGrpCode,ShipToDefault,BilltoDefault,Address,ZipCode,MailAddress,MailZipCode,Phone1,ContactPerson,Currency,U_VendorCode,U_OMEG_QBRelated,U_OMEG_AcctType,U_Portal_Sync,U_ApprovalStatus,CreateDate,CreateTime,UpdateDate,UpdateTime,CurrentAccountBalance,OpenChecksBalance,CompanyPrivate),BusinessPartnerGroups($select=Code,Name,Type),PaymentTermsTypes($select=GroupNumber,PaymentTermsGroupName),Currencies($select=Code,Name)&$filter=BusinessPartners/GroupCode eq BusinessPartnerGroups/Code and BusinessPartners/PayTermsGrpCode eq PaymentTermsTypes/GroupNumber and BusinessPartners/Currency eq Currencies/Code  and (BusinessPartners/CardType eq 'cCustomer' or BusinessPartners/CardType eq 'cLid') and BusinessPartners/U_Portal_Sync eq 'Y'&$skip=${skip}&$orderby=BusinessPartners/CardCode asc`,
        headers: { Prefer: `odata.maxpagesize=${BP_MASTER_MAX_PAGE_SIZE}` },
      })) as { value?: any[] } | null

      value = request?.value || []
    } else {
      const cardTypeValue = BUSINESS_PARTNER_STD_API_VALUES_MAP[cardType] || 'cLid'

      //* create request
      const request = (await callSapServiceLayerApi({
        url: `${SAP_BASE_URL}/b1s/v1/$crossjoin(BusinessPartners,BusinessPartnerGroups,PaymentTermsTypes,Currencies)?$expand=BusinessPartners($select=CardCode,CardName,CardType,GroupCode,PayTermsGrpCode,ShipToDefault,BilltoDefault,Address,ZipCode,MailAddress,MailZipCode,Phone1,ContactPerson,Currency,U_VendorCode,U_OMEG_QBRelated,U_OMEG_AcctType,U_Portal_Sync,U_ApprovalStatus,CreateDate,CreateTime,UpdateDate,UpdateTime,CurrentAccountBalance,OpenChecksBalance,CompanyPrivate),BusinessPartnerGroups($select=Code,Name,Type),PaymentTermsTypes($select=GroupNumber,PaymentTermsGroupName),Currencies($select=Code,Name)&$filter=BusinessPartners/GroupCode eq BusinessPartnerGroups/Code and BusinessPartners/PayTermsGrpCode eq PaymentTermsTypes/GroupNumber and BusinessPartners/Currency eq Currencies/Code and (BusinessPartners/CardType eq '${cardTypeValue}') and BusinessPartners/U_Portal_Sync eq 'Y'&$skip=${skip}&$orderby=BusinessPartners/CardCode asc`,
        headers: { Prefer: `odata.maxpagesize=${BP_MASTER_MAX_PAGE_SIZE}` },
      })) as { value?: any[] } | null

      value = request?.value || []
    }

    return value.filter(Boolean)
  } catch (error) {
    console.log(error, `Failed to fetch bp master from SAP: Page (${page})`)
    return []
  }
}

export async function getLatestBpMaster(cardType: string): Promise<{ CardCode: string } | null> {
  if (!cardType) return null

  try {
    const totalCount = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/BusinessPartners/$count?$filter=CardType eq '${cardType}'`,
    })

    if (!totalCount || totalCount <= 0) return null

    const totalPages = Math.ceil(safeParseInt(totalCount) / 500)
    const requestPromises: Promise<any>[] = []

    for (let i = 0; i < totalPages; i++) {
      const skip = i * 500

      requestPromises.push(
        callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/BusinessPartners?$select=CardCode&$skip=${skip}&$filter=CardType eq '${cardType}' and startswith(CardCode,'${cardType}')`,
          headers: { Prefer: `odata.maxpagesize=${500}` },
        })
      )
    }

    const bpMasterResults = await Promise.all(requestPromises)
    const bpMasterCardCodes = bpMasterResults
      .flatMap((res) => res?.value || [])
      .filter(Boolean)
      .map((bp) => bp.CardCode as string)

    if (bpMasterCardCodes.length === 0) return null

    //* Resolve true numeric max, safe against mixed digit-widths
    let maxNum = 0
    let maxCode = ''

    for (const code of bpMasterCardCodes) {
      const numericPart = code.replace(new RegExp(`^${cardType}`), '')
      const num = parseInt(numericPart, 10)

      if (!isNaN(num) && num > maxNum) {
        maxNum = num
        maxCode = code
      }
    }

    if (maxNum === 0 || !maxCode) return null

    return { CardCode: maxCode }
  } catch (error) {
    console.error(error, 'Failed to fetch latest bp master from SAP')
    return null
  }
}

export const getLatestBpMasterClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardType: z.string() }))
  .action(async ({ parsedInput }) => {
    return getLatestBpMaster(parsedInput.cardType)
  })

export const syncToSap = action
  .use(authenticationMiddleware)
  .schema(importFormSchema.extend({ cardType: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow, cardType } = parsedInput
    const { userId } = ctx

    const toUpdateSyncStatus: number[] = []

    try {
      const sapBatch: { rowNumber: number; code: number; promise: Promise<any>; row: Record<string, any> }[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]
        const rowNumber = stats.completed + i + 1 //* global row number across chunks

        //* check required fields
        if (!row?.CardCode) errors.push({ field: 'Code', message: 'Missing required field' })

        if (!row?.CardName) errors.push({ field: 'Name', message: 'Missing required field' })

        if (!row?.CardType) errors.push({ field: 'Type', message: 'Missing required field' })

        //* if errors present, push to stats.errors and skip
        if (errors.length > 0) {
          stats.errors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        //* fetch address and contacts
        const [addresses, contacts] = await Promise.all([getAddresses(row?.CardCode ?? ''), getContacts(row?.CardCode ?? '')])

        const toCreateAddresses = addresses
          .filter((addr) => !addr?.deletedAt || !addr?.deletedBy)
          .map((addr) => ({
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

        const toCreateContacts = contacts
          .filter((contct) => !contct?.deletedAt || !contct?.deletedBy)
          .map((contct) => ({
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

      //* create bps into sap
      const sapCreated = await Promise.all(sapBatch.map((b) => b.promise))

      //* populate error if any related to sap
      for (let i = 0; i < sapCreated.length; i++) {
        const batchItem = sapBatch[i] //* sapCreated and sapBatch has the same order

        //* if error present means there's an error when creating in sap
        if (sapCreated[i].error) {
          //* find the import error related to the batch items code
          const importSyncError = stats.errors.find((e) => e?.code === batchItem?.code)

          //* update the error if there existing import error otherwise create a new one
          if (importSyncError) {
            importSyncError.entries.push({
              field: 'SAP Error',
              message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error',
            })
          } else {
            stats.errors.push({
              rowNumber: batchItem.rowNumber,
              entries: [{ field: 'SAP Error', message: sapCreated[i]?.error?.message?.value || 'Unknown SAP error' }],
              row: batchItem.row,
              code: batchItem.code,
            })
          }

          continue
        }

        //* only codes that did not encounter a sap error are added
        toUpdateSyncStatus.push(batchItem.code)
      }

      //* update the sync status of the business partner created in sap
      await db.businessPartner.updateMany({
        where: { code: { in: toUpdateSyncStatus } },
        data: { syncStatus: 'synced', updatedBy: userId },
      })

      //* progress based on items processed (attempted) this chunk
      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + toUpdateSyncStatus.length, //* only bps successfully created in SAP
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      if (updatedStats.status === 'completed') {
        // //* create notification
        // void createNotification(ctx, {
        //   permissionCode: cardType === 'L' || cardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
        //   title: `${BUSINESS_PARTNER_TYPE_MAP[cardType]}s Synced To SAP`,
        //   message: `${updatedStats.completed - updatedStats.errors.length} of ${total} ${BUSINESS_PARTNER_TYPE_MAP[cardType].toLowerCase()}${total > 1 ? 's were' : 'was'} synced into SAP by ${ctx.fullName}. ${updatedStats.errors.length} error${updatedStats.errors.length > 1 ? 's' : ''} found.`,
        //   link: `/${cardType === 'L' || cardType === 'C' ? 'customers' : 'suppliers'}`,
        //   entityType: 'BusinessPartner' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${BUSINESS_PARTNER_TYPE_MAP[cardType]} sync successfully!. ${updatedStats.synced}/${total} ${BUSINESS_PARTNER_TYPE_MAP[cardType].toLowerCase()} created into SAP. ${updatedStats.errors.length} errors found.`,
        action: 'SYNC_TO_SAP',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = data.map((row, index) => ({
        rowNumber: stats.completed + index + 1,
        code: row?.code,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data sync error!',
        action: 'SYNC_TO_SAP',
        stats,
      }
    }
  })

export const syncFromSap = action
  .use(authenticationMiddleware)
  .schema(importFormSchema.extend({ cardType: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const { data, total, stats, isLastRow, cardType } = parsedInput
    const { userId } = ctx

    const SYNC_META_CODE = BUSINESS_PARTNER_TYPE_MAP[cardType].toLowerCase()

    try {
      //* get last sync date
      const syncMeta = await db.syncMeta.findUnique({ where: { code: SYNC_META_CODE } })
      const lastSyncDate = syncMeta?.lastSyncAt || new Date('01/01/2020')

      //* rebuild CardName -> CardCode map from existing bps to block duplicate names (deduped against db each page)
      const existingBps = await db.businessPartner.findMany({
        where: { CardType: cardType },
        select: { CardCode: true, CardName: true },
      })

      const nameMap = new Map<string, string>()
      const addressMap = new Map<string, any[]>()
      const contactMap = new Map<string, any[]>()

      existingBps.forEach((bp) => {
        if (bp?.CardName) nameMap.set(bp.CardName.trim(), bp.CardCode)
      })

      const batch: Prisma.BusinessPartnerUncheckedCreateInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]
        const rowNumber = stats.completed + i + 1 //* global row number across pages

        const bp = row?.BusinessPartners
        const bpGroup = row?.BusinessPartnerGroups
        const paymentTerm = row?.PaymentTermsTypes
        const currencies = row?.Currencies

        //* skip (not an error): not created/updated since last sync
        const createDateTime = combineSapDateTime(bp?.CreateDate, bp?.CreateTime)
        const updateDateTime = combineSapDateTime(bp?.UpdateDate, bp?.UpdateTime)

        const isCreateDateTimeSameDay = createDateTime ? isSameDay(createDateTime, lastSyncDate) : false
        const isUpdateDateTimeSameDay = updateDateTime ? isSameDay(updateDateTime, lastSyncDate) : false
        const isCreateDateTimeAfter = createDateTime ? isAfter(createDateTime, lastSyncDate) : false
        const isUpdateDateTimeAfter = updateDateTime ? isAfter(updateDateTime, lastSyncDate) : false

        if (!(isCreateDateTimeSameDay || isUpdateDateTimeSameDay || isCreateDateTimeAfter || isUpdateDateTimeAfter)) continue

        //* check required fields
        if (!bp || !bp?.CardCode) {
          errors.push({ field: 'CardCode', message: 'Missing required field' })
          stats.errors.push({ rowNumber, entries: errors, row: bp, code: bp?.CardCode, name: bp?.CardName })
          continue
        }

        //* skip (not an error): blocks duplicate CardName with different CardCode
        const trimmedName = bp?.CardName?.trim()
        if (!trimmedName) continue

        const existingCode = nameMap.get(trimmedName)

        //* card name already exists in db (or earlier in this page) under a different card code
        if (existingCode && existingCode !== bp?.CardCode) continue

        //* reserve the name so later rows in the same page are deduped too
        if (!existingCode) nameMap.set(trimmedName, bp?.CardCode)

        //* reshape data
        batch.push({
          syncStatus: 'synced',

          //* sap fields
          CardCode: bp?.CardCode,
          CardName: bp?.CardName,
          CardType: bp?.CardType,
          CurrName: currencies?.Name || null,
          CurrCode: currencies?.Code || null,
          GroupCode: bpGroup?.code || null,
          GroupName: bpGroup?.Name || null,
          GroupNum: paymentTerm?.GroupNumber || null,
          PymntGroup: paymentTerm?.PaymentTermsGroupName || null,
          Phone1: bp?.Phone1 || null,
          AcctType: bp?.U_OMEG_AcctType || null,
          CmpPrivate: bp?.CompanyPrivate || null,
        })
      }

      //* fetch addresses & contacts for this page's allowed bps
      const [bpAddreses, bpContacts] = await Promise.all([
        Promise.all(batch.map((bp) => getMasterAddresses(bp?.CardCode ?? ''))),
        Promise.all(batch.map((bp) => getMasterContacts(bp?.CardCode ?? ''))),
      ])

      batch.forEach((bp, index) => {
        addressMap.set(bp.CardCode, bpAddreses[index]?.value ?? [])
        contactMap.set(bp.CardCode, bpContacts[index]?.value ?? [])
      })

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

      //* commit the page, single transaction since data is already paged (max 1 page per call)
      await db.$transaction(async (tx) => {
        await Promise.all(
          batch.map((bpData) =>
            tx.businessPartner.upsert({
              where: { CardCode: bpData.CardCode },
              create: { ...bpData, createdBy: userId, updatedBy: userId },
              update: { ...bpData, updatedBy: userId },
            })
          )
        )
        await upsertAddresses(batch, tx)
        await upsertContacts(batch, tx)
      })

      const progress = total > 0 ? ((stats.completed + data.length) / total) * 100 : 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + data.length,
        synced: stats.synced + batch.length, //* only rows actually upserted (excludes skipped/errored)
        progress,
        status: progress >= 100 || isLastRow ? 'completed' : 'processing',
      }

      //* upsert sync meta only when the whole sync is completed
      if (updatedStats.status === 'completed') {
        await db.syncMeta.upsert({
          where: { code: SYNC_META_CODE },
          create: { code: SYNC_META_CODE, description: `Last ${SYNC_META_CODE} master synced date`, lastSyncAt: new Date() },
          update: { code: SYNC_META_CODE, description: `Last ${SYNC_META_CODE} master synced date`, lastSyncAt: new Date() },
        })

        // //* create notification
        // void createNotification(ctx, {
        //   permissionCode: cardType === 'L' || cardType === 'C' ? PERMISSIONS_CODES.CUSTOMERS : PERMISSIONS_CODES.SUPPLIERS,
        //   title: `${BUSINESS_PARTNER_TYPE_MAP[cardType]}s Synced From SAP`,
        //   message: `${BUSINESS_PARTNER_TYPE_MAP[cardType]}${total > 1 ? 's were' : ' was'} synced from SAP by ${ctx.fullName}.`,
        //   link: `/${cardType === 'L' || cardType === 'C' ? 'customers' : 'suppliers'}`,
        //   entityType: 'BusinessPartner' as Prisma.ModelName,
        //   userCodes: [],
        // })
      }

      return {
        status: 200,
        message: `${updatedStats.synced}/${total} ${BUSINESS_PARTNER_TYPE_MAP[cardType]} master synced. ${updatedStats.errors.length} errors found.`,
        action: 'SYNC_FROM_SAP',
        stats: updatedStats,
      }
    } catch (error) {
      console.error('Data sync error:', error)

      const errors = data.map((row: any) => ({
        rowNumber: row?.rowNumber as number,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
        row: null,
      })) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data sync error!',
        action: 'SYNC_FROM_SAP',
        stats,
      }
    }
  })
