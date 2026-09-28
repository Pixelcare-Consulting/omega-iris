'use server'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL, SAP_NO_PAGINATION } from '@/constants/sap'

export async function getPaymentTerms() {
  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query4')/List`,
      headers: { Prefer: SAP_NO_PAGINATION },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPaymentTermsClient = action.use(authenticationMiddleware).action(async () => {
  return getPaymentTerms()
})
