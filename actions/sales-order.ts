'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

export async function getSalesOrderByWorkOrderCode(code?: number | null) {
  if (!code) return null

  try {
    return callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('query21')/List`,
      headers: { Prefer: 'odata.maxpagesize=999' },
      data: { ParamList: `WorkOrderIDFrom=${code}&WorkOrderIDTo=${code}` },
    })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getSalesOrderByWorkOrderCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ code: z.coerce.number().nullish() }))
  .action(async ({ parsedInput }) => {
    return getSalesOrderByWorkOrderCode(parsedInput.code)
  })
