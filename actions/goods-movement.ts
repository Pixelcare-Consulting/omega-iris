'use server'

import { Prisma } from '@prisma/client'

import { safeParseInt } from '@/utils'
import { callSapServiceLayerApi } from './sap-service-layer'
import { SAP_BASE_URL } from '@/constants/sap'

type GoodsReceiptLineItem = Prisma.WorkOrderItemGetPayload<{ include: { projectItem: { include: { item: true } } } }>

type DocumentLine = {
  ItemCode: string
  Quantity: number
  WarehouseCode: string
  BatchNumbers: { BatchNumber: string; Quantity: number }[]
}

//* consolidate wo line items with same mpn & warehouse as total quantity, same shape for a receipt and an issue
function buildDocumentLines(woLineItems: GoodsReceiptLineItem[]) {
  const uniqueMpnMap = new Map<string, DocumentLine>()

  for (const li of woLineItems) {
    const pItem = li?.projectItem
    const mpn = pItem?.item?.ItemCode
    const warehouseCode = pItem?.warehouseCode
    const qty = safeParseInt(li?.qty)

    if (!mpn || !warehouseCode || qty < 1) continue

    const key = `${mpn}|${warehouseCode}`

    const documentLine = uniqueMpnMap.get(key) ?? { ItemCode: mpn, Quantity: 0, WarehouseCode: warehouseCode, BatchNumbers: [] }

    documentLine.Quantity += qty

    //* a project item without a serial has no batch to move
    if (pItem.DistNumber) documentLine.BatchNumbers.push({ BatchNumber: pItem.DistNumber, Quantity: qty })

    uniqueMpnMap.set(key, documentLine)
  }

  return Array.from(uniqueMpnMap.values())
}

export async function createGoodsReceipt(dbCode: string, workOrderCode: number, woLineItems: GoodsReceiptLineItem[]) {
  try {
    const documentLines = buildDocumentLines(woLineItems)

    //* nothing to receive, sap rejects an empty document
    if (documentLines.length < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods receipt due to missing document lines!',
        action: 'CREATE_GOODS_RECEIPT',
      }
    }

    //* post goods receipt
    const result = await callSapServiceLayerApi({
      dbCode,
      url: `${SAP_BASE_URL}/b1s/v1/InventoryGenEntries`,
      method: 'post',
      data: {
        Comments: `Created from IRIS - Work Order ${workOrderCode}`,
        DocumentLines: documentLines,
      },
    })

    if (result?.error) {
      return {
        error: true,
        status: 500,
        message: result.error?.message?.value || 'Failed to create goods receipt!',
        action: 'CREATE_GOODS_RECEIPT',
      }
    }

    return result
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error?.message || 'Failed to create goods receipt!',
      action: 'CREATE_GOODS_RECEIPT',
    }
  }
}

//* reverses a goods receipt by moving the same lines back out, for when sap has no Cancel action on InventoryGenEntries
export async function createGoodsIssue(dbCode: string, workOrderCode: number, woLineItems: GoodsReceiptLineItem[]) {
  try {
    const documentLines = buildDocumentLines(woLineItems)

    //* nothing to issue, sap rejects an empty document
    if (documentLines.length < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods issue due to missing document lines!',
        action: 'CREATE_GOODS_ISSUE',
      }
    }

    //* post goods issue
    const result = await callSapServiceLayerApi({
      dbCode,
      url: `${SAP_BASE_URL}/b1s/v1/InventoryGenExits`,
      method: 'post',
      data: {
        Comments: `Created from IRIS - reversal of Goods Receipt - Work Order ${workOrderCode}`,
        DocumentLines: documentLines,
      },
    })

    if (result?.error) {
      return {
        error: true,
        status: 500,
        message: result.error?.message?.value || 'Failed to create goods issue!',
        action: 'CREATE_GOODS_ISSUE',
      }
    }

    return result
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error?.message || 'Failed to create goods issue!',
      action: 'CREATE_GOODS_ISSUE',
    }
  }
}

export async function createGrpo(dbCode: string, workOrderCode: number, supplierCode: string, woLineItems: GoodsReceiptLineItem[]) {
  try {
    //* grpo is posted against a vendor, sap rejects it without one
    if (!supplierCode) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods receipt PO due to missing supplier!',
        action: 'CREATE_GRPO',
      }
    }

    const documentLines = buildDocumentLines(woLineItems)

    //* nothing to receive, sap rejects an empty document
    if (documentLines.length < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods receipt PO due to missing document lines!',
        action: 'CREATE_GRPO',
      }
    }

    //* post goods receipt po
    const result = await callSapServiceLayerApi({
      dbCode,
      url: `${SAP_BASE_URL}/b1s/v1/PurchaseDeliveryNotes`,
      method: 'post',
      data: {
        CardCode: supplierCode,
        Comments: `Created from IRIS - Work Order ${workOrderCode}`,
        DocumentLines: documentLines,
      },
    })

    if (result?.error) {
      return {
        error: true,
        status: 500,
        message: result.error?.message?.value || 'Failed to create goods receipt PO!',
        action: 'CREATE_GRPO',
      }
    }

    return result
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error?.message || 'Failed to create goods receipt PO!',
      action: 'CREATE_GRPO',
    }
  }
}

//* reverses a grpo, lines are copied from the grpo itself so each one links back to its base line
export async function createGoodsReturn(dbCode: string, workOrderCode: number, grpoDocEntry: number) {
  try {
    if (!grpoDocEntry || grpoDocEntry < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods return due to invalid goods receipt PO doc entry!',
        action: 'CREATE_GOODS_RETURN',
      }
    }

    const grpo = await callSapServiceLayerApi({
      dbCode,
      url: `${SAP_BASE_URL}/b1s/v1/PurchaseDeliveryNotes(${grpoDocEntry})`,
      method: 'get',
    })

    if (grpo?.error) {
      return {
        error: true,
        status: 500,
        message: grpo.error?.message?.value || 'Failed to get goods receipt PO!',
        action: 'CREATE_GOODS_RETURN',
      }
    }

    const documentLines = ((grpo?.DocumentLines ?? []) as any[]).map((line) => ({
      BaseType: 20, //* 20 = goods receipt po
      BaseEntry: grpoDocEntry,
      BaseLine: line.LineNum,
      Quantity: line.Quantity,
      BatchNumbers: ((line.BatchNumbers ?? []) as any[]).map((b) => ({ BatchNumber: b.BatchNumber, Quantity: b.Quantity })),
    }))

    //* nothing to return, sap rejects an empty document
    if (documentLines.length < 1) {
      return {
        error: true,
        status: 400,
        message: 'Failed to create goods return due to missing document lines!',
        action: 'CREATE_GOODS_RETURN',
      }
    }

    //* post goods return
    const result = await callSapServiceLayerApi({
      dbCode,
      url: `${SAP_BASE_URL}/b1s/v1/PurchaseReturns`,
      method: 'post',
      data: {
        CardCode: grpo?.CardCode,
        Comments: `Created from IRIS - reversal of Goods Receipt PO ${grpo?.DocNum} - Work Order ${workOrderCode}`,
        DocumentLines: documentLines,
      },
    })

    if (result?.error) {
      return {
        error: true,
        status: 500,
        message: result.error?.message?.value || 'Failed to create goods return!',
        action: 'CREATE_GOODS_RETURN',
      }
    }

    return result
  } catch (error: any) {
    return {
      error: true,
      status: 500,
      message: error?.message || 'Failed to create goods return!',
      action: 'CREATE_GOODS_RETURN',
    }
  }
}
