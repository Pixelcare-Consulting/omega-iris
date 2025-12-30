'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getStates(countryCode: string) {
  if (!countryCode) return []

  try {
    return await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query7')/List`,
      headers: { Prefer: 'odata.maxpagesize=999' },
      data: { ParamList: `Country='${countryCode}'` },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getStatesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ countryCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getStates(parsedInput.countryCode)
  })
