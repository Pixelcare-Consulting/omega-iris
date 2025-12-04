'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getWoItemsByWoCode(workOrderCode?: number | null) {
  if (!workOrderCode) return []

  try {
    return await db.workOrderItem.findMany({
      where: { workOrderCode },
      include: { projectItem: { include: { item: true, projectIndividual: true } } },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getWoItemByWoCodeByPiCodeWithWhouseCode(
  workOrderCode?: number | null,
  projectItemCode?: number | null,
  warehouseCode?: number | null
) {
  if (!workOrderCode || !projectItemCode || !warehouseCode) return null

  try {
    return await db.workOrderItem.findUnique({
      where: { workOrderCode_projectItemCode: { workOrderCode, projectItemCode } },
      include: {
        projectItem: {
          include: {
            item: {
              include: {
                itemWarehouseInventory: { where: { warehouseCode }, include: { warehouse: true } },
              },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const getWoItemByWoCodeByPiCodeWithWhouseCodeClient = action
  .use(authenticationMiddleware)
  .schema(
    z.object({
      workOrderCode: z.coerce.number().nullish(),
      projectItemCode: z.coerce.number().nullish(),
      warehouseCode: z.coerce.number().nullish(),
    })
  )
  .action(async ({ parsedInput }) => {
    return getWoItemByWoCodeByPiCodeWithWhouseCode(parsedInput.workOrderCode, parsedInput.projectItemCode, parsedInput.warehouseCode)
  })

export const getWoItemsByWoCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ workOrderCode: z.coerce.number().nullish() }))
  .action(async ({ parsedInput }) => {
    return getWoItemsByWoCode(parsedInput.workOrderCode)
  })
