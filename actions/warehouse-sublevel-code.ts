'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL, WAREHOUSE_SUBLEVEL_CODES_MAX_PAGE_SIZE } from '@/constants/sap'
import { safeParseInt } from '@/utils'

export async function getWarehouseSubLevelCodes(sublevel: number) {
  if (!sublevel) return []

  try {
    const totalCount = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/WarehouseSublevelCodes/$count?$filter=WarehouseSublevel eq ${sublevel}`,
    })

    if (!totalCount || totalCount <= 0) return []

    const totalPages = Math.ceil(safeParseInt(totalCount) / WAREHOUSE_SUBLEVEL_CODES_MAX_PAGE_SIZE)
    const requestPromises: Promise<any>[] = []

    for (let i = 0; i <= totalPages; i++) {
      const skip = i * WAREHOUSE_SUBLEVEL_CODES_MAX_PAGE_SIZE

      requestPromises.push(
        callSapServiceLayerApi({
          url: `${SAP_BASE_URL}/b1s/v1/WarehouseSublevelCodes?$filter=WarehouseSublevel eq ${sublevel}&$skip=${skip}`,
          headers: { Prefer: `odata.maxpagesize=${WAREHOUSE_SUBLEVEL_CODES_MAX_PAGE_SIZE}` },
        })
      )
    }

    const warehouseSubLevelCodesResults = await Promise.all(requestPromises)

    return warehouseSubLevelCodesResults.flatMap((res) => res?.value || [])
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getWarehouseSubLevelCodesClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ sublevel: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return getWarehouseSubLevelCodes(parsedInput.sublevel)
  })
