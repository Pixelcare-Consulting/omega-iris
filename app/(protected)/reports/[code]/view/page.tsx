import { notFound } from 'next/navigation'

import { getReportByCode } from '@/actions/report'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewReport from './_components/view-report'

export default async function ReportViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const report = await getReportByCode(parseInt(code))

  if (!report) notFound()

  return (
    <ContentContainer>
      <ViewReport report={report} />
    </ContentContainer>
  )
}
