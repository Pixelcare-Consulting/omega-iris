'use server'

import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { db } from '@/utils/db'
import {
  projectIndividualCustomerFormSchema,
  projectIndividualFormSchema,
  projectIndividualPicFormSchema,
} from '@/schema/project-individual'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import z from 'zod'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'

const COMMON_PROJECT_INDIVIDUAL_INCLUDE = {
  projectGroup: { select: { code: true, name: true } },
} satisfies Prisma.ProjectIndividualInclude

const COMMON_PROJECT_INDIVIDUAL_ORDER_BY = { code: 'asc' } satisfies Prisma.ProjectIndividualOrderByWithRelationInput

export async function getPis() {
  try {
    return await db.projectIndividual.findMany({
      where: { deletedAt: null, deletedBy: null },
      include: COMMON_PROJECT_INDIVIDUAL_INCLUDE,
      orderBy: COMMON_PROJECT_INDIVIDUAL_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisClient = action.use(authenticationMiddleware).action(async () => {
  return getPis()
})

export async function getPisByGroupCode(groupCode: number) {
  if (!groupCode) return []

  try {
    return await db.projectIndividual.findMany({
      where: { deletedAt: null, deletedBy: null, projectGroup: { code: groupCode } },
      include: COMMON_PROJECT_INDIVIDUAL_INCLUDE,
      orderBy: COMMON_PROJECT_INDIVIDUAL_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisByGroupCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ groupCode: z.coerce.number() }))
  .action(async ({ parsedInput }) => {
    return getPisByGroupCode(parsedInput.groupCode)
  })

export async function getPiByCode(code: number) {
  if (!code) return null

  try {
    const projectIndividuals = await db.projectIndividual.findUnique({ where: { code }, include: COMMON_PROJECT_INDIVIDUAL_INCLUDE })

    if (!projectIndividuals) return null

    //TODO: separate the fetching of customers and pics into separate actions & hooks
    const [customers, pics] = await Promise.all([
      db.projectIndividualCustomer.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
      db.projectIndividualPic.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
    ])

    return { ...projectIndividuals, customers: customers.map((c) => c.userCode), pics: pics.map((p) => p.userCode) }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getPisByBpUserCode(userCode?: number | null) {
  try {
    if (!userCode) return []

    const projectIndividualCustomers = await db.projectIndividualCustomer.findMany({
      where: { userCode },
      orderBy: { code: 'asc' },
      select: { projectIndividual: true },
    })

    const result = projectIndividualCustomers.map((p) => p.projectIndividual)

    return result
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getPisByBpUserCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ userCode: z.coerce.number().nullish() }))
  .action(async ({ parsedInput: data }) => {
    return getPisByBpUserCode(data.userCode)
  })

export const upsertPi = action
  .use(authenticationMiddleware)
  .schema(projectIndividualFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers, pics, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update project individual
      if (code !== -1) {
        const [updatedPi] = await db.$transaction([
          //* update project individual
          db.projectIndividual.update({
            where: { code },
            data: { ...data, updatedBy: userId },
          }),

          //* delete existing project individual customers
          db.projectIndividualCustomer.deleteMany({ where: { projectIndividualCode: code } }),

          //* create new project individual customers
          db.projectIndividualCustomer.createManyAndReturn({
            data: customers.map((c) => ({ projectIndividualCode: code, userCode: c })),
          }),

          //* delete existing project individual pics
          db.projectIndividualPic.deleteMany({ where: { projectIndividualCode: code } }),

          //* create new project individual pics
          db.projectIndividualPic.createManyAndReturn({
            data: pics.map((p) => ({ projectIndividualCode: code, userCode: p })),
          }),
        ])

        return {
          status: 200,
          message: 'Project individual updated successfully!',
          action: 'UPSERT_PROJECT_INDIVIDUAL',
          data: { projectIndividual: updatedPi },
        }
      }

      //* create project individual
      const newPi = await db.projectIndividual.create({
        data: {
          ...data,
          projectIndividualCustomers: {
            createMany: { data: customers.map((c) => ({ userCode: c })) },
          },
          projectIndividualPics: {
            createMany: { data: pics.map((p) => ({ userCode: p })) },
          },
          createdBy: userId,
          updatedBy: userId,
        },
      })

      return {
        status: 200,
        message: 'Project individual created successfully!',
        action: 'UPSERT_PROJECT_INDIVIDUAL',
        data: { projectIndividual: newPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_PROJECT_INDIVIDUAL',
      }
    }
  })

export const importPis = action
  .use(authenticationMiddleware)
  .schema(z.object({ data: z.array(z.record(z.string(), z.any())) }))
  .action(async ({ ctx, parsedInput }) => {
    const { data } = parsedInput
    const { userId } = ctx

    const importErrors: ImportSyncError[] = []

    try {
      const batch: Prisma.ProjectIndividualCreateManyInput[] = []

      for (let i = 0; i < data.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = data[i]

        //* check required fields
        if (!row?.['Name']) errors.push({ field: 'Name', message: 'Missing required fields' })

        //* if errors array is not empty, then update/push to importErrors
        if (errors.length > 0) {
          importErrors.push({ rowNumber: row.rowNumber, entries: errors, row })
          continue
        }

        //* reshape data
        const toCreate: Prisma.ProjectIndividualCreateManyInput = {
          name: row['Name'],
          groupCode: row?.['Group ID'] || null,
          description: row?.['Description'] || null,
          isActive: row?.['Active'] === '1' ? true : false,
          createdBy: userId,
          updatedBy: userId,
        }

        batch.push(toCreate)
      }

      //* commit the batch
      await db.projectIndividual.createMany({
        data: batch,
        skipDuplicates: true,
      })

      return {
        status: 200,
        message: `Project individuals imported successfully!. ${importErrors.length} errors found.`,
        action: 'IMPORT_PROJECT_INDIVIDUALS',
        errors: importErrors,
      }
    } catch (error) {
      console.error('Data import error:', error)

      const errors = data.map((row) => ({
        rowNumber: row.rowNumber,
        entries: [{ field: 'Unknown', message: 'Unexpected batch write error' }],
      }))

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Data import error!',
        action: 'IMPORT_PROJECT_INDIVIDUALS',
        errors,
      }
    }
  })

export const updatePiCustomers = action
  .use(authenticationMiddleware)
  .schema(projectIndividualCustomerFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers } = parsedInput
    const { userId } = ctx

    try {
      const pi = await db.projectIndividual.findUnique({ where: { code } })

      if (!pi) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS' }
      }

      //* update project individual
      const [updatedPi] = await db.$transaction([
        //* update project individual
        db.projectIndividual.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project individual customers
        db.projectIndividualCustomer.deleteMany({ where: { projectIndividualCode: code } }),

        //* create new project individual customers
        db.projectIndividualCustomer.createManyAndReturn({
          data: customers.map((c) => ({ projectIndividualCode: code, userCode: c })),
        }),
      ])

      return {
        status: 200,
        message: `Project individual's customers updated successfully!`,
        action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS',
        data: { projectIndividual: updatedPi },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS',
      }
    }
  })

export const updatePiPics = action
  .use(authenticationMiddleware)
  .schema(projectIndividualPicFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, pics } = parsedInput
    const { userId } = ctx

    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code } })

      if (!projectIndividual) {
        return { error: true, status: 404, message: 'Project individual not found!', action: 'UPDATE_PROJECT_INDIVIDUAL_PICS' }
      }

      //* update project individual
      const [updatedProjectIndividual] = await db.$transaction([
        //* update project individual
        db.projectIndividual.update({
          where: { code },
          data: { updatedBy: userId },
        }),

        //* delete existing project individual pics
        db.projectIndividualPic.deleteMany({ where: { projectIndividualCode: code } }),

        //* create new project individual pics
        db.projectIndividualPic.createManyAndReturn({
          data: pics.map((p) => ({ projectIndividualCode: code, userCode: p })),
        }),
      ])

      return {
        status: 200,
        message: `Project individual's P.I.Cs updated successfully!`,
        action: 'UPDATE_PROJECT_INDIVIDUAL_PICS',
        data: { projectIndividual: updatedProjectIndividual },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPDATE_PROJECT_INDIVIDUAL_PICS',
      }
    }
  })

export const deleletePi = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code: data.code } })

      if (!projectIndividual)
        return { error: true, status: 404, message: 'Project individual not found!', action: 'DELETE_PROJECT_INDIVIDUAL' }

      await db.projectIndividual.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      return { status: 200, message: 'Project individual deleted successfully!', action: 'DELETE_PROJECT_INDIVIDUAL' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        action: 'DELETE_PROJECT_INDIVIDUAL',
      }
    }
  })
