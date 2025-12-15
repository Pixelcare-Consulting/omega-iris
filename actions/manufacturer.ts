'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getManufacturers() {
  try {
    return await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/Manufacturers`,
      headers: { Prefer: 'odata.maxpagesize=999' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getManufacturersClient = action.use(authenticationMiddleware).action(async () => {
  return getManufacturers()
})

export async function getManufacturerByCode(code: number) {
  try {
    return await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Manufacturers(${code})` })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getManufacturerByCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return await getManufacturerByCode(parsedInput.code)
  })
