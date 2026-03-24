'use client'

import { useEffect, useMemo, useState } from 'react'
import { Item } from 'devextreme-react/toolbar'
import SelectBox, { SelectBoxTypes } from 'devextreme-react//select-box'

import { getDashboardReports } from '@/actions/report'
import PageHeader from '../../_components/page-header'
import PageContentWrapper from '../../_components/page-content-wrapper'
import { Badge } from '@/components/badge'
import dynamic from 'next/dynamic'
import { Icons } from '@/components/icons'
import { getCurrentUserAbility } from '@/actions/auth'

type DashboardReportProps = {
  reports: Awaited<ReturnType<typeof getDashboardReports>>
  params?: Record<string, any>
}

const ReportViewer = dynamic(() => import('@/components/report-viewer'), { ssr: false })

const SELECTED_DASHBOARD_REPORT_KEY = 'selected-dashboard-report'

export default function DashboardReport({ reports, params }: DashboardReportProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const selectedReport = useMemo(() => {
    if (!selected) return null
    return reports.find((r) => r.code === selected)
  }, [JSON.stringify(reports), JSON.stringify(selected)])

  const onValueChanged = (e: SelectBoxTypes.ValueChangedEvent) => {
    setSelected(e.value)
    localStorage.setItem(SELECTED_DASHBOARD_REPORT_KEY, e.value)
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

  //* set selectedDashboardReport if SELECTED_DASHBOARD_REPORT_KEY is in local storage exists
  useEffect(() => {
    const selected = localStorage.getItem(SELECTED_DASHBOARD_REPORT_KEY)

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

      <PageContentWrapper className='h-[calc(100vh_-_100px)]'>
        <div className='h-full [&>div]:h-full'>
          {reports.length > 0 ? (
            <ReportViewer key={selectedReport?.code} type={'1'} data={selectedReport?.data} params={params} />
          ) : (
            <div className='flex items-center justify-center'>
              <div className='flex flex-col items-center justify-center'>
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
      </PageContentWrapper>
    </div>
  )
}
