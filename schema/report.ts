import { z } from 'zod'

export const REPORT_TYPE = {
  Dashboard: 1,
  Paginated: 2,
} as const

export const REPORT_TYPE_LABEL = {
  '1': 'Dashboard',
  '2': 'Paginated',
} as const

export const REPORT_BLANK_SRC = {
  // '1': '/misc/test-blank-dashboard.mrt',
  // '2': '/misc/test-blank-paginated.mrt',
  '1': '/misc/blank-dashboard.mrt',
  '2': '/misc/blank-paginated.mrt',
}

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
