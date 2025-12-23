'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getBpGroups() {
  try {
    return await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/BusinessPartnerGroups`,
      headers: { Prefer: 'odata.maxpagesize=999' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBpGroupsClient = action.use(authenticationMiddleware).action(async () => {
  return getBpGroups()
})

export async function getBpGroupByCode(code: number) {
  try {
    return await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/BusinessPartnerGroups(${code})` })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getBpGroupByCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return await getBpGroupByCode(parsedInput.code)
  })
