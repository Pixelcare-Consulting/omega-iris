import { notFound } from 'next/navigation'

import { getReportByCode } from '@/actions/report'
import ContentContainer from '@/app/(protected)/_components/content-container'
import { REPORT_TYPE_LABEL } from '@/schema/report'
import dynamic from 'next/dynamic'
import UnderDevelopment from '@/components/under-development'

const ReportForm = dynamic(() => import('../_components/report-form'), { ssr: false })

export default async function ReportPage({ params, searchParams }: { params: { code: string }; searchParams: { type: string } }) {
  const { code } = params
  const { type } = searchParams

  const report = await getReportByCode(parseInt(code))

  const reportType = REPORT_TYPE_LABEL?.[type as '1' | '2'] || REPORT_TYPE_LABEL['1']

  const getPageMetadata = () => {
    if (!report || !report?.code || code == 'add') {
      return { title: `Add ${reportType} Report`, description: 'Fill in the form to design a new report.' }
    }
    return { title: `Edit ${reportType} Report`, description: "Edit the form to update this report's information." }
  }

  if ((code !== 'add' && !report) || !type) notFound()

  if (process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true') {
    return (
      <ContentContainer>
        <UnderDevelopment className='h-full' />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <ReportForm pageMetaData={getPageMetadata()} report={report} />
    </ContentContainer>
  )
}
