import { getReports } from '@/actions/report'
import ContentContainer from '../_components/content-container'
import ReportTable from './_components/report-table'
import { getCurrentUserAbility } from '@/actions/auth'
import UnderDevelopment from '@/components/under-development'

export default async function ReportingPage() {
  const userInfo = await getCurrentUserAbility()
  const reports = await getReports(userInfo)

  if (process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true') {
    return (
      <ContentContainer>
        <UnderDevelopment className='h-full' />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <ReportTable reports={reports} />
    </ContentContainer>
  )
}
