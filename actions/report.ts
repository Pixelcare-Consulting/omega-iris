'use server'

import { Prisma } from '@prisma/client'

import { paramsSchema } from '@/schema/common'
import { db } from '@/utils/db'
import { action, authenticationMiddleware } from '@/utils/safe-action'
import { markReportAsDefaultSchema, reportFormSchema } from '@/schema/report'
import { getCurrentUserAbility } from './auth'

const COMMON_REPORT_ORDER_BY = { code: 'asc' } satisfies Prisma.ReportOrderByWithRelationInput

export async function getReports(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.roleCode) return []

  const { roleCode, roleKey } = userInfo

  try {
    const where: Prisma.ReportWhereInput | undefined =
      roleKey === 'admin'
        ? undefined
        : {
            OR: [{ roleReports: { some: { roleCode } } }, { isDefault: true }],
          }

    //* get all reports if admin, otherwise get reports assigned to role
    return db.report.findMany({
      where,
      orderBy: COMMON_REPORT_ORDER_BY,
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function getDashboardReports(userInfo: Awaited<ReturnType<typeof getCurrentUserAbility>>) {
  if (!userInfo || !userInfo.userId || !userInfo.userCode) return []

  const { roleCode, roleKey } = userInfo

  try {
    //* get the default report (visible to all users)
    //* if role is business partner, get the non internal reports otherwise get internal reports
    //* get the report assigned based on the role
    //* make sure all reports are isFeatured is true and type '1' which is dashboard, and still active

    const where: Prisma.ReportWhereInput = {
      type: '1',
      isActive: true,
      ...(roleKey !== 'admin' ? (roleKey !== 'business-partner' ? {} : { isInternal: false }) : {}),
      OR: [
        { isDefault: true },
        {
          isFeatured: true,
          ...(roleKey !== 'admin' ? { roleReports: { some: { roleCode } } } : {}),
        },
      ],
    }

    return db.report.findMany({
      where,
      orderBy: { title: 'asc' },
    })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getDashboardReportsClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getDashboardReports(ctx)
})

export const getReportsClient = action.use(authenticationMiddleware).action(async ({ ctx }) => {
  return getReports(ctx)
})

export async function getReportByCode(code: number) {
  if (!code) return null

  try {
    return db.report.findUnique({ where: { code } })
  } catch (error) {
    console.error(error)
    return null
  }
}

export const upsertReport = action
  .use(authenticationMiddleware)
  .schema(reportFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, ...data } = parsedInput
    const { userId } = ctx

    const trimmedTitle = data.title.trim()
    const trimmedFileName = data.fileName.trim()

    try {
      const existingReport = await db.report.findFirst({
        where: {
          fileName: trimmedFileName,
          ...(code && code !== -1 && { code: { not: code } }),
        },
      })

      if (existingReport) return { error: true, status: 401, message: 'File name already exists!', action: 'UPSERT_REPORT' }

      //* update report
      if (code !== -1) {
        const updatedReport = await db.$transaction(async () => {
          const updatedReport = await db.report.update({
            where: { code },
            data: { ...data, title: trimmedTitle, fileName: trimmedFileName, updatedBy: userId },
          })

          //* if updated report is default, update all other default reports to false
          if (updatedReport.isDefault) {
            await db.report.updateMany({
              where: { isDefault: true, code: { not: updatedReport.code } },
              data: { isDefault: false },
            })
          }

          return updatedReport
        })

        //* create notification
        // void createNotification(ctx, {
        //   permissionCode: PERMISSIONS_CODES.REPORTS,
        //   title: 'Report Updated',
        //   message: `An report (#${updatedReport.code}) was updated by ${ctx.fullName}.`,
        //   link: `/reports/${updatedReport.code}/view`,
        //   entityType: 'Report' as Prisma.ModelName,
        //   entityCode: updatedReport.code,
        //   entityId: updatedReport.id,
        //   userCodes: [],
        // })

        return {
          status: 200,
          message: 'Report updated successfully!',
          action: 'UPSERT_REPORT',
          data: { report: updatedReport },
        }
      }

      //* create report
      const newReport = await db.$transaction(async () => {
        const report = await db.report.create({
          data: {
            ...data,
            title: trimmedTitle,
            fileName: trimmedFileName,
            createdBy: userId,
            updatedBy: userId,
          },
        })

        //* if new report is default, update all other default reports to false
        if (report.isDefault) {
          await db.report.updateMany({
            where: { isDefault: true, code: { not: report.code } },
            data: { isDefault: false },
          })
        }

        return report
      })

      //* create notification
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES.REPORTS,
      //     title: 'Report Created',
      //     message: `A new report (#${newReport.code}) was created by ${ctx.fullName}.`,
      //     link: `/reports/${newReport.code}/view`,
      //     entityType: 'Report' as Prisma.ModelName,
      //     entityCode: newReport.code,
      //     entityId: newReport.id,
      //     userCodes: [],
      //   })

      return {
        status: 200,
        message: 'Report created successfully!',
        action: 'UPSERT_REPORT',
        data: { report: newReport },
      }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPSERT_REPORT',
      }
    }
  })

export const deleteReport = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const report = await db.report.findUnique({ where: { code: data.code } })

      if (!report) return { error: true, status: 404, message: 'Report not found!', action: 'DELETE_REPORT' }

      await db.report.update({ where: { code: data.code }, data: { deletedAt: new Date(), deletedBy: ctx.userId } })

      //* create notification
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES.REPORTS,
      //     title: 'Report Deleted',
      //     message: `A report (#${report.code}) was deleted by ${ctx.fullName}.`,
      //     link: `/reports/${report.code}/view`,
      //     entityType: 'Report' as Prisma.ModelName,
      //     entityCode: report.code,
      //     entityId: report.id,
      //     userCodes: [],
      //   })

      return { status: 200, message: 'Item deleted successfully!', action: 'DELETE_ITEM' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_ITEM',
      }
    }
  })

export const restoreReport = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ ctx, parsedInput: data }) => {
    try {
      const report = await db.report.findUnique({ where: { code: data.code } })

      if (!report) return { error: true, status: 404, message: 'Report not found!', action: 'RESTORE_REPORT' }

      await db.report.update({ where: { code: data.code }, data: { deletedAt: null, deletedBy: null } })

      //* create notification
      //   void createNotification(ctx, {
      //     permissionCode: PERMISSIONS_CODES.REPORTS,
      //     title: 'Report Restored',
      //     message: `A report (#${report.code}) was restored by ${ctx.fullName}.`,
      //     link: `/reports/${report.code}/view`,
      //     entityType: 'Report' as Prisma.ModelName,
      //     entityCode: report.code,
      //     entityId: report.id,
      //     userCodes: [],
      //   })

      return { status: 200, message: 'Report retored successfully!', action: 'RESTORE_REPORT' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'RESTORE_REPORT',
      }
    }
  })

export const markAsDefaultReport = action
  .use(authenticationMiddleware)
  .schema(markReportAsDefaultSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { code, isDefault } = parsedInput
    const { userId } = ctx

    try {
      const report = await db.report.findUnique({ where: { code } })

      if (!report) return { error: true, status: 404, message: 'Report not found!', action: 'MARK_REPORT_AS_DEFAULT' }

      if (!isDefault && report.isDefault) {
        const defaultCount = await db.report.count({ where: { isDefault: true } })

        if (defaultCount <= 1) {
          return {
            error: true,
            status: 400,
            message: 'At least one report must remain default.',
            action: 'MARK_REPORT_AS_DEFAULT',
          }
        }
      }

      await db.$transaction(async () => {
        //* upate report
        const updatedReport = await db.report.update({
          where: { code },
          data: { isDefault, updatedBy: userId },
        })

        //* if updated report is default, update all other default reports to false
        if (updatedReport.isDefault) {
          await db.report.updateMany({
            where: { isDefault: true, code: { not: updatedReport.code } },
            data: { isDefault: false },
          })
        }
      })

      //* create notification
      // void createNotification(ctx, {
      //   permissionCode: PERMISSIONS_CODES.REPORTS,
      //   title: 'Report Marked as Default',
      //   message: `A report (#${report.code}) was marked as default by ${ctx.fullName}.`,
      //   link: `/reports/${report.code}/view`,
      //   entityType: 'Report' as Prisma.ModelName,
      //   entityCode: report.code,
      //   entityId: report.id,
      //   userCodes: [],
      // })

      return { status: 200, message: 'Report marked as default!', action: 'MARK_REPORT_AS_DEFAULT' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'MARK_REPORT_AS_DEFAULT',
      }
    }
  })
