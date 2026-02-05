'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'
import { db } from '@/utils/db'

export async function getContacts(cardCode: string) {
  if (!cardCode) return []

  try {
    return db.contact.findMany({ where: { CardCode: cardCode }, orderBy: { updatedAt: 'asc' } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getContactsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getContacts(parsedInput.cardCode)
  })

export async function getMasterContacts(cardCode: string) {
  if (!cardCode) return []

  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query3')/List`,
      headers: { Prefer: 'odata.maxpagesize=999' },
      data: { ParamList: `CardCode='${cardCode}'` },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getMasterContactsClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getMasterContacts(parsedInput.cardCode)
  })
