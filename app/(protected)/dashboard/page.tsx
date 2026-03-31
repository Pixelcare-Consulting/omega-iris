import UnderDevelopment from '@/app/under-development'
import ContentContainer from '../_components/content-container'
import { getCurrentUserAbility } from '@/actions/auth'
import { getDashboardReports } from '@/actions/report'
import DashboardReport from './_components/dashboard-report'

export default async function ProtectedDashboardPage() {
  const userInfo = await getCurrentUserAbility()
  const reports = await getDashboardReports(userInfo)

  if (process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true') {
    return (
      <ContentContainer>
        <UnderDevelopment className='h-full' />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <DashboardReport
        reports={reports}
        params={{ UserCode: userInfo?.userCode }}
        userInfo={{
          userId: userInfo?.userId,
          userCode: userInfo?.userCode,
          roleCode: userInfo?.roleCode,
          roleKey: userInfo?.roleKey,
          roleName: userInfo?.roleName,
        }}
      />
    </ContentContainer>
  )
}
