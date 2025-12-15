'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { BASE_URL } from '@/constants/common'

export async function getItemGroups() {
  try {
    return await callSapServiceLayerApi({
      url: `${BASE_URL}/b1s/v1/ItemGroups`,
      headers: { Prefer: 'odata.maxpagesize=999' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getItemGroupsClient = action.use(authenticationMiddleware).action(async () => {
  return getItemGroups
})

export async function getItemGroupByCode(code: number) {
  try {
    return await callSapServiceLayerApi({ url: `${BASE_URL}/b1s/v1/ItemGroups(${code})` })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getItemGroupByCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return await getItemGroupByCode(parsedInput.code)
  })
