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

const COMMON_PROJECT_INDIVIDUAL_INCLUDE = {
  projectGroup: { select: { name: true } },
} satisfies Prisma.ProjectIndividualInclude

export async function getProjectIndividuals() {
  try {
    return await db.projectIndividual.findMany({
      where: { deletedAt: null, deletedBy: null },
      include: COMMON_PROJECT_INDIVIDUAL_INCLUDE,
    })
  } catch (error) {
    return []
  }
}

export async function getProjectIndividualByCode(code: number) {
  if (!code) return null

  try {
    const projectIndividuals = await db.projectIndividual.findUnique({ where: { code }, include: COMMON_PROJECT_INDIVIDUAL_INCLUDE })

    if (!projectIndividuals) return null

    const [customers, pics] = await Promise.all([
      db.projectIndividualCustomer.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
      db.projectIndividualPic.findMany({ where: { projectIndividualCode: code }, select: { userCode: true } }),
    ])

    return { ...projectIndividuals, customers: customers.map((c) => c.userCode), pics: pics.map((p) => p.userCode) }
  } catch (err) {
    return null
  }
}

export const upsertProjectIndividual = action
  .use(authenticationMiddleware)
  .schema(projectIndividualFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers, pics, ...data } = parsedInput
    const { userId } = ctx

    try {
      //* update project individual
      if (code !== -1) {
        const [updatedProjectIndividual] = await db.$transaction([
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
          data: { projectIndividual: updatedProjectIndividual },
        }
      }

      //* create project individual
      const newProjectIndividual = await db.projectIndividual.create({
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
        data: { projectIndividual: newProjectIndividual },
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

export const updateProjectIndividualCustomers = action
  .use(authenticationMiddleware)
  .schema(projectIndividualCustomerFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, customers } = parsedInput
    const { userId } = ctx

    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code } })

      if (!projectIndividual) {
        return { error: true, code: 404, message: 'Project individual not found', action: 'UPDATE_PROJECT_INDIVIDUAL_CUSTOMERS' }
      }

      //* update project individual
      const [updatedProjectIndividual] = await db.$transaction([
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
        data: { projectIndividual: updatedProjectIndividual },
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

export const updateProjectIndividualPics = action
  .use(authenticationMiddleware)
  .schema(projectIndividualPicFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, pics } = parsedInput
    const { userId } = ctx

    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code } })

      if (!projectIndividual) {
        return { error: true, code: 404, message: 'Project individual not found', action: 'UPDATE_PROJECT_INDIVIDUAL_PICS' }
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

export const deleleteProjectIndividual = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const projectIndividual = await db.projectIndividual.findUnique({ where: { code: data.code } })

      if (!projectIndividual)
        return { error: true, code: 404, message: 'Project individual not found', action: 'DELETE_PROJECT_INDIVIDUAL' }

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
