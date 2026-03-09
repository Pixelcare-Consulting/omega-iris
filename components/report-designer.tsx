'use client'

import { ReportDesignerConfig, ReportDesignerTypeMap, useReportDesigner } from '@/hooks/use-report-designer'
import { DashboardDesigner, PaginatedDesigner } from '@/utils/stimulsoft'

export type DashboardRptDesignerProps = React.ComponentProps<typeof DashboardDesigner>
export type PaginatedRptDesignerProps = React.ComponentProps<typeof PaginatedDesigner>

export const REPORT_DESIGNER_ID = 'StiDesigner'

type ExtendedProps = {
  data?: any
  config?: ReportDesignerConfig
}

type ReportDesignerProps = (
  | { type: '1'; designerProps?: DashboardRptDesignerProps }
  | { type: '2'; designerProps?: PaginatedRptDesignerProps }
) &
  ExtendedProps

export default function ReportDesigner({ type, designerProps, data, config }: ReportDesignerProps) {
  const reportDesigner = useReportDesigner(type, data, config)

  if (!reportDesigner?.report || !reportDesigner.options || !reportDesigner.isReady) return null

  switch (type) {
    case '1':
      return (
        <DashboardDesigner
          {...designerProps}
          report={reportDesigner?.report as ReportDesignerTypeMap['1']['report']}
          options={reportDesigner?.options as ReportDesignerTypeMap['1']['options']}
        />
      )

    case '2':
      return (
        <PaginatedDesigner
          {...designerProps}
          report={reportDesigner?.report as ReportDesignerTypeMap['2']['report']}
          options={reportDesigner?.options as ReportDesignerTypeMap['2']['options']}
        />
      )
  }
}
