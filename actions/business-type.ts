'use server'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL, SAP_NO_PAGINATION } from '@/constants/sap'

export async function getBusinessTypes() {
  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query20')/List`,
      headers: { Prefer: SAP_NO_PAGINATION },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBusinessTypesClient = action.use(authenticationMiddleware).action(async () => {
  return getBusinessTypes()
})
