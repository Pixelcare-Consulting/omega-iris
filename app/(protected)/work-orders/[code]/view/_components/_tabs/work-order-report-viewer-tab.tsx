'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getWorkOrderByCode } from '@/actions/work-order'
import dynamic from 'next/dynamic'
import { getReportByCode } from '@/actions/report'

type ReportViewerTabProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  report: Awaited<ReturnType<typeof getReportByCode>>
}

const ReportViewer = dynamic(() => import('@/components/report-viewer'), { ssr: false })

export default function WorkOrderReportViewerTab({ workOrder, report }: ReportViewerTabProps) {
  if (!report || !report?.data || !workOrder?.code) return null

  return (
    <ScrollView className='h-full' useNative>
      <div className='grid h-full grid-cols-12 gap-5 p-2'>
        <div className='col-span-12 [&>div]:h-full'>
          <ReportViewer key={report?.code} type={'2'} data={report?.data} params={{ WorkOrderCode: workOrder?.code }} />
        </div>
      </div>
    </ScrollView>
  )
}
