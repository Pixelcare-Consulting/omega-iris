'use server'

import z from 'zod'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import { callSapServiceLayerApi } from './sap-service-layer'
import { ITEM_STOCK_BY_WAREHOUSE_MAX_PAGE_SIZE, SAP_BASE_URL } from '@/constants/sap'
import { safeParseInt } from '@/utils'

//* live stock of an item in a warehouse, straight from SAP
export async function getSapItemStockByWarehouse(warehouseCode?: string | null, itemCode?: string | null) {
  if (!warehouseCode || !itemCode) return null

  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('item-stock-by-warehouse-item')/List`,
      method: 'post',
      data: { ParamList: `WhsCode='${warehouseCode}'&ItemCode='${itemCode}'` },
    })

    return response?.value?.[0] || null
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getSapItemStockByWarehouseClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ warehouseCode: z.string().nullish(), itemCode: z.string().nullish() }))
  .action(async ({ parsedInput }) => {
    return getSapItemStockByWarehouse(parsedInput.warehouseCode, parsedInput.itemCode)
  })

export async function getSapItemStockCountByWarehouse(warehouseCode?: string | null) {
  if (!warehouseCode) return 0

  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('item-stock-by-warehouse-count')/List`,
      method: 'post',
      data: { ParamList: `WhsCode='${warehouseCode}'` },
    })

    return response?.value?.[0]?.TotalCount || 0
  } catch (error) {
    console.error(error)
    return 0
  }
}

//* every item held in a warehouse, straight from SAP. the count query tells us how many pages to ask for
//* so the pages can be fetched in parallel instead of walking them one at a time
export async function getSapItemStockListByWarehouse(warehouseCode?: string | null, isSynced?: boolean) {
  if (!warehouseCode) return []

  if (!isSynced) {
    console.error(`Warehouse "${warehouseCode}" is not synced, item inventory not available`)
    return []
  }

  try {
    const totalCount = await getSapItemStockCountByWarehouse(warehouseCode)
    const totalPages = Math.ceil(safeParseInt(totalCount) / ITEM_STOCK_BY_WAREHOUSE_MAX_PAGE_SIZE)

    const requestPromises: Promise<any>[] = []

    for (let i = 0; i < totalPages; i++) {
      const skip = i * ITEM_STOCK_BY_WAREHOUSE_MAX_PAGE_SIZE //* offset

      const response = callSapServiceLayerApi({
        url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('item-stock-by-warehouse')/List?$skip=${skip}`,
        headers: { Prefer: `odata.maxpagesize=${ITEM_STOCK_BY_WAREHOUSE_MAX_PAGE_SIZE}` },
        method: 'post',
        data: { ParamList: `WhsCode='${warehouseCode}'` },
      })

      requestPromises.push(response)
    }

    const pages = await Promise.all(requestPromises)

    return pages.flatMap((res) => res?.value || []).filter(Boolean)
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getSapItemStockListByWarehouseClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ warehouseCode: z.string().nullish(), isSynced: z.boolean() }))
  .action(async ({ parsedInput }) => {
    return getSapItemStockListByWarehouse(parsedInput.warehouseCode, parsedInput.isSynced)
  })
