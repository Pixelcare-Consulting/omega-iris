import ScrollView from 'devextreme-react/scroll-view'

import { getReportByCode } from '@/actions/report'
import dynamic from 'next/dynamic'
import ReportInitializing from '@/components/report-initializing'

type ReportViewerTabProps = {
  report: NonNullable<Awaited<ReturnType<typeof getReportByCode>>>
}

const ReportViewer = dynamic(() => import('@/components/report-viewer'), {
  ssr: false,
  loading: () => <ReportInitializing className='h-[calc(100vh_-_275px)]' />,
})

export default function ReportViewerTab({ report }: ReportViewerTabProps) {
  return (
    <ScrollView className='h-full' useNative>
      <div className='grid h-full grid-cols-12 gap-5 p-2'>
        <div className='col-span-12 [&>div]:h-full'>
          <ReportViewer key={report?.code} type={'1'} data={report?.data} />
        </div>
      </div>
    </ScrollView>
  )
}
