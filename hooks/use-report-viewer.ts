'use client'

import { DashboardRptViewerProps, PaginatedReportViewerProps } from '@/components/report-viewer'
import { REPORT_BLANK_SRC, ReportType } from '@/schema/report'
import { useEffect, useRef, useState } from 'react'

export type ReportViewerTypeMap = {
  '1': {
    report?: DashboardRptViewerProps['report']
    options?: DashboardRptViewerProps['options']
  }
  '2': {
    report?: PaginatedReportViewerProps['report']
    options?: PaginatedReportViewerProps['options']
  }
}

export function useReportViewer<T extends keyof ReportViewerTypeMap>(type: T, data?: any, params?: Record<string, any>) {
  const isMounted = useRef(false)
  const reportREf = useRef<ReportViewerTypeMap[T]['report'] | null>(null)

  const [report, setReport] = useState<ReportViewerTypeMap[T]['report']>()
  const [options, setOptions] = useState<ReportViewerTypeMap[T]['options']>()
  const [isReady, setIsReady] = useState(false)

  const load = async (type: ReportType) => {
    switch (type) {
      case '1':
        {
          const dashboardModule = await import('stimulsoft-dashboards-js-react/viewer')
          const stiDashboardRptViewer = dashboardModule.Stimulsoft

          const report = new stiDashboardRptViewer.Report.StiReport()
          const options = new stiDashboardRptViewer.Viewer.StiViewerOptions()

          //* load report
          if (data) report.load(data)
          else report.loadFile(REPORT_BLANK_SRC['1'])

          //* compile first - this fully initializes the dictionary and variables

          //* inject parameters
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              const variables = report.dictionary.variables
              const variable = variables.getByName(key)
              console.log({ key, value, variables, variable })
              if (variable) variable.value = value
            })
          }

          //* set web server url
          stiDashboardRptViewer.StiOptions.WebServer.url = process.env.NEXT_PUBLIC_REPORT_SERVER_URL!

          //* set report ref
          reportREf.current = report

          //* configure options
          options.height = '100%'
          options.toolbar.showAboutButton = false
          options.toolbar.showFullScreenButton = false
          options.toolbar.showOpenButton = false

          if (isMounted.current && isReady) {
            setReport(report)
            setOptions(options)
          }
        }
        break

      case '2':
        {
          const paginatedModule = await import('stimulsoft-reports-js-react/viewer')
          const stiPaginatedRptViewer = paginatedModule.Stimulsoft

          const report = new stiPaginatedRptViewer.Report.StiReport()
          const options = new stiPaginatedRptViewer.Viewer.StiViewerOptions()

          //* load report
          if (data) report.load(data)
          else report.loadFile(REPORT_BLANK_SRC['2'])

          //* inject parameters using valueObject - correct JS API
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              const variables = report.dictionary?.variables
              const variable = variables?.getByName(key)
              console.log({ key, value, variables, variable })
              if (variable) variable.value = value
            })
          }

          //* set web server url!
          stiPaginatedRptViewer.StiOptions.WebServer.url = process.env.NEXT_PUBLIC_REPORT_SERVER_URL!

          //* set report ref
          reportREf.current = report

          //* configure options
          options.height = '100%'
          options.toolbar.showAboutButton = false
          options.toolbar.showFullScreenButton = false
          options.toolbar.showOpenButton = false

          if (isMounted.current) {
            setReport(report)
            setOptions(options)
          }
        }
        break
    }
  }

  //* set isReady
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  //* initialize viewer
  useEffect(() => {
    isMounted.current = true

    //* load
    load(type)

    return () => {
      //* set isMounted to false
      isMounted.current = false

      //* dispose previous report
      if (reportREf.current) {
        try {
          reportREf.current.dispose?.()
          reportREf.current = null
          console.log('DISPOSING REPORT...')
        } catch (error) {
          console.error('ERROR DISPOSING REPORT:', error)
        }
      }

      setReport(undefined)
      setOptions(undefined)
    }
  }, [type, data, isReady])

  return { report, options, isMounted: isMounted.current, isReady }
}
