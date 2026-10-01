import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

import { getBlankReport } from '@/actions/report'
import ContentContainer from '@/app/(protected)/_components/content-container'
import UnderDevelopment from '@/components/under-development'
import { IS_BLANK_REPORT_EDITING_ALLOWED } from '@/schema/report'

const BlankReportDesigner = dynamic(() => import('./_components/blank-report-designer'), { ssr: false })

export default async function BlankReportPage({ searchParams }: { searchParams: { type?: string } }) {
  const { type } = searchParams

  //! the route stays hidden unless blank editing is switched on
  if (!IS_BLANK_REPORT_EDITING_ALLOWED || (type !== '1' && type !== '2')) notFound()

  if (process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true') {
    return (
      <ContentContainer>
        <UnderDevelopment className='h-full' />
      </ContentContainer>
    )
  }

  const blankReport = await getBlankReport(type)

  return (
    <ContentContainer>
      <BlankReportDesigner type={type} data={blankReport?.data} />
    </ContentContainer>
  )
}
