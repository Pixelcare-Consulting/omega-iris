'use client'

import { ReportViewerTypeMap, useReportViewer } from '@/hooks/use-report-viewer'
import { DashboardViewer, PaginatedViewer } from '@/utils/stimulsoft'

export type DashboardRptViewerProps = React.ComponentProps<typeof DashboardViewer>
export type PaginatedReportViewerProps = React.ComponentProps<typeof PaginatedViewer>

type ExtendedProps = {
  data?: any
  params?: Record<string, any>
}

type ReportViewerProps = ({ type: '1'; viewerProps?: DashboardRptViewerProps } | { type: '2'; viewerProps?: PaginatedReportViewerProps }) &
  ExtendedProps

export default function ReportViewer({ type, viewerProps, data, params }: ReportViewerProps) {
  const reportViewer = useReportViewer(type, data, params)

  if (!reportViewer?.report || !reportViewer.options || !reportViewer.isReady) return null

  switch (type) {
    case '1':
      return (
        <DashboardViewer
          {...viewerProps}
          report={reportViewer?.report as ReportViewerTypeMap['1']['report']}
          options={reportViewer?.options as ReportViewerTypeMap['1']['options']}
        />
      )

    case '2':
      return (
        <PaginatedViewer
          {...viewerProps}
          report={reportViewer?.report as ReportViewerTypeMap['2']['report']}
          options={reportViewer?.options as ReportViewerTypeMap['2']['options']}
        />
      )
  }
}
