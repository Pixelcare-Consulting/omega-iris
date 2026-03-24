'use client'

import { DashboardRptDesignerProps, PaginatedRptDesignerProps } from '@/components/report-designer'
import { REPORT_BLANK_SRC, ReportType } from '@/schema/report'
import { useEffect, useRef, useState } from 'react'

export type ReportDesignerTypeMap = {
  '1': {
    report?: DashboardRptDesignerProps['report']
    options?: DashboardRptDesignerProps['options']
  }
  '2': {
    report?: PaginatedRptDesignerProps['report']
    options?: PaginatedRptDesignerProps['options']
  }
}

export type ReportDesignerConfig = {
  isHideSaveButton?: boolean
  isHideSaveAsButton?: boolean
}

export function useReportDesigner<T extends keyof ReportDesignerTypeMap>(
  type: T,
  data?: any,
  { isHideSaveButton = false, isHideSaveAsButton = false }: ReportDesignerConfig = {},
  params?: Record<string, any>
) {
  const isMounted = useRef(false)
  const reportREf = useRef<ReportDesignerTypeMap[T]['report'] | null>(null)

  const [report, setReport] = useState<ReportDesignerTypeMap[T]['report']>()
  const [options, setOptions] = useState<ReportDesignerTypeMap[T]['options']>()
  const [isReady, setIsReady] = useState(false)

  const load = async (type: ReportType) => {
    switch (type) {
      case '1':
        {
          const dashboardModule = await import('stimulsoft-dashboards-js-react/designer')
          const stiDashboardRptDesigner = dashboardModule.Stimulsoft

          const report = new stiDashboardRptDesigner.Report.StiReport()
          const options = new stiDashboardRptDesigner.Designer.StiDesignerOptions()

          //* load report
          if (data) report.load(data)
          else report.loadFile(REPORT_BLANK_SRC['1'])

          //* inject parameters
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              const variables = report.dictionary.variables
              const variable = variables.getByName(key)
              if (variable) variable.value = value
            })
          }

          //* set web server url
          stiDashboardRptDesigner.StiOptions.WebServer.url = process.env.NEXT_PUBLIC_REPORT_SERVER_URL!

          //* set report ref
          reportREf.current = report

          //* configure options
          options.height = '100%'
          options.toolbar.showFileMenuInfo = false
          options.toolbar.showFileMenuNew = false
          options.toolbar.showFileMenuOpen = false
          options.toolbar.showFileMenuClose = false
          options.toolbar.showFileMenuOptions = false
          options.toolbar.showAboutButton = false
          options.toolbar.showFileMenuSave = isHideSaveButton ? false : true
          options.toolbar.showFileMenuSaveAs = isHideSaveAsButton ? false : true
          options.appearance.showSaveDialog = false

          if (isMounted.current && isReady) {
            setReport(report)
            setOptions(options)
          }
        }
        break
      case '2':
        {
          const paginatedModule = await import('stimulsoft-reports-js-react/designer')
          const stiPaginatedRptDesigner = paginatedModule.Stimulsoft

          const report = new stiPaginatedRptDesigner.Report.StiReport()
          const options = new stiPaginatedRptDesigner.Designer.StiDesignerOptions()

          //* load report
          if (data) report.load(data)
          else report.loadFile(REPORT_BLANK_SRC['2'])

          //* inject parameters
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              const variables = report.dictionary.variables
              const variable = variables.getByName(key)
              if (variable) variable.value = value
            })
          }

          //* set web server url!
          stiPaginatedRptDesigner.StiOptions.WebServer.url = process.env.NEXT_PUBLIC_REPORT_SERVER_URL!

          //* set report ref
          reportREf.current = report

          //* configure options
          options.height = '100%'
          options.toolbar.showFileMenuInfo = false
          options.toolbar.showFileMenuNew = false
          options.toolbar.showFileMenuOpen = false
          options.toolbar.showFileMenuClose = false
          options.toolbar.showFileMenuOptions = false
          options.toolbar.showAboutButton = false
          options.toolbar.showFileMenuSave = isHideSaveButton ? false : true
          options.toolbar.showFileMenuSaveAs = isHideSaveAsButton ? false : true
          options.appearance.showSaveDialog = false

          if (isMounted.current && isReady) {
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
    console.log('trigger')

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
          console.error('Error disposing report:', error)
        }
      }

      setReport(undefined)
      setOptions(undefined)
    }
  }, [type, data, isReady])

  return { report, options, load, isMounted, isReady }
}
