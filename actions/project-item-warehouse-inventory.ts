'use server'

import z from 'zod'

import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'

export async function getProjectItemWarehouseInventoryByPItemCode(projectItemCode?: number) {
  if (!projectItemCode) return []

  try {
    return await db.projectItemWarehouseInventory.findMany({ where: { projectItemCode }, include: { warehouse: true } })
  } catch (error) {
    return []
  }
}

export const getProjectItemWarehouseInventoryByPItemCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ projectItemCode: z.number().optional() }))
  .action(async ({ parsedInput }) => {
    return getProjectItemWarehouseInventoryByPItemCode(parsedInput.projectItemCode)
  })
