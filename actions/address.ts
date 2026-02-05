'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { db } from '@/utils/db'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getAddresses(cardCode: string) {
  if (!cardCode) return []

  try {
    return db.address.findMany({ where: { CardCode: cardCode }, orderBy: { updatedAt: 'asc' } })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getAddressById(id: string) {
  if (!id) return null

  try {
    return db.address.findUnique({ where: { id } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getAddressesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getAddresses(parsedInput.cardCode)
  })

export const getAddressByIdClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    return getAddressById(parsedInput.id)
  })

export async function getMasterAddresses(cardCode: string) {
  if (!cardCode) return []

  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query6')/List`,
      headers: { Prefer: 'odata.maxpagesize=999' },
      data: { ParamList: `CardCode='${cardCode}'` },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getMasterAddressesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ cardCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getMasterAddresses(parsedInput.cardCode)
  })
