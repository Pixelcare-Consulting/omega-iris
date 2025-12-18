'use server'

import { SAP_BASE_URL } from '@/constants/sap'
import { callSapServiceLayerApi } from './sap-service-layer'
import logger from '@/utils/logger'
import { safeParseInt } from '@/utils'

const PER_PAGE = 500

export async function getItemMaster() {
  try {
    const totalCount = await callSapServiceLayerApi({ url: `${SAP_BASE_URL}/b1s/v1/Items/$count?$filter=U_Portal_Sync eq 'Y'` })
    const totalPage = Math.ceil(safeParseInt(totalCount) / PER_PAGE)

    const requestsPromises = []

    for (let i = 0; i <= totalPage; i++) {
      const skip = i * PER_PAGE //* offset

      //* create request
      const request = callSapServiceLayerApi({
        url: `${SAP_BASE_URL}/b1s/v1/$crossjoin(Items,ItemGroups,Manufacturers)?$expand=Items($select=ItemCode,ItemName,ItemsGroupCode,Manufacturer,ManageBatchNumbers,PurchaseItemsPerUnit,U_MPN,U_MSL,CreateDate,UpdateDate,U_Portal_Sync),ItemGroups($select=Number,GroupName),Manufacturers($select=Code,ManufacturerName)&$filter=Items/ItemsGroupCode eq ItemGroups/Number and Items/Manufacturer eq Manufacturers/Code and Items/U_Portal_Sync eq 'Y'&$top=${PER_PAGE}&$skip=${skip}&$orderby=ItemCode asc`,
        headers: { Prefer: `odata.maxpagesize=${PER_PAGE}` },
      })

      //* push request to the requestsPromises array
      requestsPromises.push(request)
    }

    //* fetch all item master from sap in parallel
    const itemMaster = await Promise.all(requestsPromises)

    return itemMaster
      .flatMap((res) => res?.value || [])
      .filter(Boolean)
      .sort((a, b) => a?.Items.ItemCode - b?.Items.ItemCode)
  } catch (error) {
    console.log({ error })
    logger.error(error, 'Failed to fetch item master from SAP')
    return []
  }
}
