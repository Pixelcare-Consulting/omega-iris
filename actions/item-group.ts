'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getItemGroups() {
  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/ItemGroups`,
      headers: { Prefer: 'odata.maxpagesize=999' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getItemGroupsClient = action.use(authenticationMiddleware).action(async () => {
  return getItemGroups()
})

export async function getItemGroupByCode(code: number) {
  try {
    return callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/ItemGroups(${code})` })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getItemGroupByCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return getItemGroupByCode(parsedInput.code)
  })
