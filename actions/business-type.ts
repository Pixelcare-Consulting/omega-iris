'use server'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getBusinessTypes() {
  try {
    return await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('20')/List`,
      headers: { Prefer: 'odata.maxpagesize=999' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBusinessTypesClient = action.use(authenticationMiddleware).action(async () => {
  return getBusinessTypes()
})
