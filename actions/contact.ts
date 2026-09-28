'use server'

import z from 'zod'

import { action, authenticationMiddleware, tenantMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL, SAP_NO_PAGINATION } from '@/constants/sap'
import { db } from '@/utils/db'

export async function getContacts(dbCode: string, cardCode: string) {
  if (!cardCode) return []

  try {
    return db.contact.findMany({ where: { dbCode, CardCode: cardCode }, orderBy: { updatedAt: 'asc' } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getContactsClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getContacts(ctx.dbCode, parsedInput.cardCode)
  })

export async function getMasterContacts(cardCode: string) {
  if (!cardCode) return []

  try {
    return callSapServiceLayerApi({
      method: 'post',
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query3')/List`,
      headers: { Prefer: SAP_NO_PAGINATION },
      data: { ParamList: `CardCode='${cardCode}'` },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getMasterContactsClient = action
  .use(authenticationMiddleware)
  .use(tenantMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getMasterContacts(parsedInput.cardCode)
  })
