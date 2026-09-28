'use server'

import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { db } from '@/utils/db'
import { SAP_BASE_URL, SAP_NO_PAGINATION } from '@/constants/sap'

export async function getAddresses(dbCode: string, cardCode: string) {
  if (!cardCode) return []

  try {
    return db.address.findMany({ where: { dbCode, CardCode: cardCode }, orderBy: { updatedAt: 'asc' } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getAddressById(dbCode: string, id: string) {
  if (!id) return null

  try {
    return db.address.findFirst({ where: { id, dbCode } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getAddressesClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getAddresses(ctx.dbCode, parsedInput.cardCode)
  })

export const getAddressByIdClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ id: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getAddressById(ctx.dbCode, parsedInput.id)
  })

export async function getMasterAddresses(cardCode: string) {
  if (!cardCode) return []

  try {
    return callSapServiceLayerApi({
      method: 'post',
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query6')/List`,
      headers: { Prefer: SAP_NO_PAGINATION },
      data: { ParamList: `CardCode='${cardCode}'` },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getMasterAddressesClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getMasterAddresses(parsedInput.cardCode)
  })
