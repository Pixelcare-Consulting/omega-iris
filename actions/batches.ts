'use server'

import { BATCH_MASTER_MAX_PAGE_SIZE, SAP_BASE_URL } from '@/constants/sap'
import { callSapServiceLayerApi } from './sap-service-layer'
import { safeParseInt } from '@/utils'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import z from 'zod'

export async function getBatchesMasterCountByWarehouseCode(warehouseCode: string) {
  if (!warehouseCode) return 0

  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-warehouse-count')/List`,
      method: 'post',
      data: { ParamList: `WhsCode='${warehouseCode}'` },
    })

    return response?.value?.[0]?.TotalCount || 0
  } catch (error) {
    console.error(error)
    return 0
  }
}

export async function getBatchesMasterCountProjectCode(projectCode: number, warehouseCode: string) {
  if (!projectCode || !warehouseCode) return 0

  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-project-warehouse-count')/List`,
      method: 'post',
      data: { ParamList: `projectId=${projectCode}&WhsCode='${warehouseCode}'` },
    })

    return response?.value?.[0]?.TotalCount || 0
  } catch (error) {
    console.error(error)
    return 0
  }
}

export async function getBatchMasterByItemCodeDistNumber(itemCode: string, distNumber: string) {
  if (!itemCode || !distNumber) return null

  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-item-batch-number')/List`,
      method: 'post',
      data: { ParamList: `ItemCode='${itemCode}'&DistNumber='${distNumber}'` },
    })

    return response?.value?.[0] || null
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getBatchMasterByItemCodeDistNumberClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ itemCode: z.string(), distNumber: z.string() }))
  .action(async ({ parsedInput }) => {
    return getBatchMasterByItemCodeDistNumber(parsedInput.itemCode, parsedInput.distNumber)
  })

export async function getBatchMasterByItemCodeDistNumberWarehouseCodeBinCode(
  itemCode: string,
  distNumber: string,
  warehouseCode: string,
  binCode: string
) {
  try {
    const response = await callSapServiceLayerApi({
      url: `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-item-batch-number-item-warehouse-bin-location')/List`,
      method: 'post',
      data: { ParamList: `ItemCode='${itemCode}'&DistNumber='${distNumber}'&WhsCode='${warehouseCode}'&BinCode='${binCode}'` },
    })

    return response?.value?.[0] || null
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getBatchMasterByItemCodeDistNumberWarehouseCodeBinCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ itemCode: z.string(), distNumber: z.string(), warehouseCode: z.string(), binCode: z.string() }))
  .action(async ({ parsedInput }) => {
    return getBatchMasterByItemCodeDistNumberWarehouseCodeBinCode(
      parsedInput.itemCode,
      parsedInput.distNumber,
      parsedInput.warehouseCode,
      parsedInput.binCode
    )
  })

// TODO : Examine the performance to query all batches in a single call
export async function getBatchesMasterByWarehouseCode(warehouseCode: string, isSynced: boolean) {
  if (!isSynced) {
    console.error(`Warehouse "${warehouseCode}" is not synced, batches not available`)
    return []
  }

  try {
    const totalCount = await getBatchesMasterCountByWarehouseCode(warehouseCode)
    const totalPages = Math.ceil(safeParseInt(totalCount) / BATCH_MASTER_MAX_PAGE_SIZE)

    const requestPromises: Promise<any>[] = []

    for (let i = 0; i < totalPages; i++) {
      const skip = i * BATCH_MASTER_MAX_PAGE_SIZE //* offset

      const url = `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-warehouse')/List?$skip=${skip}`

      //* create request
      const response = callSapServiceLayerApi({
        url,
        headers: { Prefer: `odata.maxpagesize=${BATCH_MASTER_MAX_PAGE_SIZE}` },
        data: { ParamList: `WhsCode='${warehouseCode}'` },
        method: 'post',
      })

      //* push request to the requestsPromises array
      requestPromises.push(response)
    }

    //* fetch all batches from sap in parallel
    const batchMaster = await Promise.all(requestPromises)

    return batchMaster.flatMap((res) => res?.value || []).filter(Boolean)
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBatchesMasterByWarehouseCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ warehouseCode: z.string(), isSynced: z.boolean() }))
  .action(async ({ parsedInput }) => {
    return getBatchesMasterByWarehouseCode(parsedInput.warehouseCode, parsedInput.isSynced)
  })

// TODO : Examine the performance to query all batches in a single call
export async function getBatchesMasterByProjectCode(projectCode: number, warehouseCodes: string[]) {
  try {
    if (!warehouseCodes.length) {
      console.error(`No warehouses are synced, batches not available`)
      return []
    }

    //* get total count of batches per project per warehouse
    const totalCountsRes = await Promise.all(
      warehouseCodes.map((warehouseCode) => getBatchesMasterCountProjectCode(projectCode, warehouseCode))
    )

    const totalCountsPerProjectWithWarehouse = warehouseCodes.map((warehouseCode, i) => ({
      warehouseCode,
      count: totalCountsRes[i],
    }))

    //* query batches per warehouseCode
    //* making sure all fetched batches are from the synced warehouses
    const requestPromises: Promise<any>[] = []

    //! Current issue passing multiple WhsCode in "ParamList"  e.g.(projectId=2&WhsCode='PH11','MH1') to the query seems to have issue and not working on SQL Queries
    //! Possible cause will be the SQL Queries syntax conflict under the hood, especially using "LIKE", "CONCAT"
    for (let i = 0; i < totalCountsPerProjectWithWarehouse.length; i++) {
      const batchPerProjectWithWarehouse = totalCountsPerProjectWithWarehouse[i]
      const warehouseCode = batchPerProjectWithWarehouse.warehouseCode
      const totalCount = batchPerProjectWithWarehouse.count
      const totalPages = Math.ceil(safeParseInt(totalCount) / BATCH_MASTER_MAX_PAGE_SIZE)

      for (let j = 0; j < totalPages; j++) {
        const skip = j * BATCH_MASTER_MAX_PAGE_SIZE //* offset

        const url = `${SAP_BASE_URL}/b1s/v1/SQLQueries('batch-details-by-project-warehouse')/List?$skip=${skip}`
        const body = { ParamList: `projectId=${projectCode}&WhsCode='${warehouseCode}'` }

        requestPromises.push(
          callSapServiceLayerApi({
            url,
            headers: { Prefer: `odata.maxpagesize=${BATCH_MASTER_MAX_PAGE_SIZE}` },
            method: 'post',
            data: body,
          })
        )
      }
    }

    //* fetch all batches from sap in parallel
    const batchMaster = await Promise.all(requestPromises)

    return batchMaster.flatMap((res) => res?.value || []).filter(Boolean)
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getBatchesMasterByProjectCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ projectCode: z.number(), warehouseCodes: z.array(z.string()) }))
  .action(async ({ parsedInput }) => {
    return getBatchesMasterByProjectCode(parsedInput.projectCode, parsedInput.warehouseCodes)
  })
