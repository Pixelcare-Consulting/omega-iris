import { z } from 'zod'

export const REPORT_TYPE = {
  Dashboard: 1,
  Paginated: 2,
} as const

export const REPORT_TYPE_LABEL = {
  '1': 'Dashboard',
  '2': 'Paginated',
} as const

//* fixed title and file name of each type's blank report
export const REPORT_BLANK_META = {
  '1': { title: 'Blank Dashboard', fileName: 'blank-dashboard' },
  '2': { title: 'Blank Paginated', fileName: 'blank-paginated' },
} as const

//* blank report editing is a dev tool, off unless the env says so
export const IS_BLANK_REPORT_EDITING_ALLOWED = process.env.NEXT_PUBLIC_ALLOW_EDITING_BLANK_REPORT === 'true'

export const blankReportFormSchema = z.object({
  type: z.enum(['1', '2']),
  data: z.string().min(1, { message: 'Data is required' }),
})

export const reportFormSchema = z.object({
  code: z.coerce.number(),
  title: z.string().min(1, { message: 'Title is required' }),
  fileName: z.string().min(1, { message: 'File name is required' }),
  description: z.string().nullish(),
  isActive: z.boolean(),
  type: z.string().min(1, { message: 'Type is required' }),
  data: z.any().refine((data) => data !== null && data !== undefined && data !== '', { message: 'Data is required' }),
  isFeatured: z.boolean(),
  isDefault: z.boolean(),
  isInternal: z.boolean(),
})

export const markReportAsDefaultSchema = z.object({
  code: z.coerce.number(),
  isDefault: z.boolean(),
  type: z.string(),
})

export type ReportForm = z.infer<typeof reportFormSchema>
export type ReportType = `${(typeof REPORT_TYPE)[keyof typeof REPORT_TYPE]}`
