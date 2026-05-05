'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Item } from 'devextreme-react/toolbar'
import SelectBox, { SelectBoxTypes } from 'devextreme-react/select-box'
import ScrollView, { ScrollViewRef } from 'devextreme-react/scroll-view'

import { getDashboardReports } from '@/actions/report'
import PageHeader from '../../_components/page-header'
import PageContentWrapper from '../../_components/page-content-wrapper'
import { Badge } from '@/components/badge'
import dynamic from 'next/dynamic'
import { Icons } from '@/components/icons'

type DashboardReportProps = {
  reports: Awaited<ReturnType<typeof getDashboardReports>>
  params?: Record<string, any>
  userInfo?: { userId?: string; userCode?: number; roleCode?: number; roleKey?: string; roleName?: string }
}

const ReportViewer = dynamic(() => import('@/components/report-viewer'), { ssr: false })

const SELECTED_DASHBOARD_REPORT_KEY = 'selected-dashboard-report'

export default function DashboardReport({ reports, params, userInfo }: DashboardReportProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const scrollRef = useRef<ScrollViewRef>(null)

  const localStorageKey = useMemo(() => {
    return `${userInfo?.userCode}-${SELECTED_DASHBOARD_REPORT_KEY}`
  }, [SELECTED_DASHBOARD_REPORT_KEY, userInfo?.userCode])

  const selectedReport = useMemo(() => {
    if (!selected) return null
    return reports.find((r) => r.code === selected)
  }, [JSON.stringify(reports), JSON.stringify(selected)])

  const onValueChanged = (e: SelectBoxTypes.ValueChangedEvent) => {
    setSelected(e.value)
    localStorage.setItem(localStorageKey, e.value)
  }

  const itemRender = (params: any) => {
    return (
      <div className='flex items-center gap-2.5'>
        <div className='w-[95%] truncate text-center' title={params?.title}>
          {params?.title}
        </div>
        {params?.isDefault && <div className='size-2.5 rounded-full bg-primary' />}
      </div>
    )
  }

  //* set selectedDashboardReport if lsKey is in local storage exists
  useEffect(() => {
    const selected = localStorage.getItem(localStorageKey)

    if (selected) {
      const report = reports.find((r) => r.code == parseInt(selected))

      if (reports.length > 0) {
        if (report) setSelected(report.code)
        else setSelected(reports[0].code)
      }
    } else {
      if (reports.length > 0) {
        const defaultReport = reports.find((r) => r.isDefault)
        if (defaultReport) setSelected(defaultReport.code)
        else setSelected(reports[0].code)
      }
    }
  }, [JSON.stringify(reports)])

  return (
    <div className='flex h-full flex-col gap-5'>
      <PageHeader
        title='Dashboard'
        description='Select a dashboard report to view insights and analytics.'
        badge={selectedReport ? <Badge>{selectedReport.title}</Badge> : undefined}
      >
        <Item location='after' widget='dxSelectBox'>
          <SelectBox
            dataSource={reports}
            labelMode='hidden'
            value={selected}
            placeholder='Select a report...'
            valueExpr='code'
            searchExpr={['title', 'description', 'fileName']}
            displayExpr='title'
            valueChangeEvent='change'
            onValueChanged={onValueChanged}
            width={400}
            itemRender={itemRender}
            elementAttr={{ class: '[&_input]:text-center' }}
            disabled={reports.length < 1}
          />
        </Item>
      </PageHeader>

      <ScrollView
        ref={scrollRef}
        showScrollbar='onHover'
        className='[&_.dx-scrollable-scrollbar] h-[calc(100vh_-175px)] rounded-md bg-primary-black/5 shadow-md'
      >
        <div className='p-4' tabIndex={0}>
          {reports.length > 0 ? (
            <ReportViewer key={selectedReport?.code} type={'1'} data={selectedReport?.data} params={params} />
          ) : (
            <div className='flex items-center justify-center'>
              <div className='flex h-[calc(100vh_-210px)] flex-col items-center justify-center'>
                <Icons.triangleAlert className='size-14 text-red-500' />
                <div className='mt-2.5 flex flex-col items-center justify-center gap-1'>
                  <h1 className='text-center text-xl font-bold text-red-500'>Dashboad Reports Not Available</h1>
                  <p className='text-center text-sm text-slate-500 dark:text-slate-400'>
                    Please contact your administrator to enable this feature.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollView>
    </div>
  )
}
