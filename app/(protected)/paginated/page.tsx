import UnderDevelopment from '@/components/under-development'
import ContentContainer from '../_components/content-container'
import { getCurrentUserAbility } from '@/actions/auth'
import { getPaginatedReports } from '@/actions/report'
import PaginatedReport from './_components/paginated-report'

export default async function ProtectedPaginatedPage() {
  const userInfo = await getCurrentUserAbility()
  const reports = await getPaginatedReports(userInfo)

  if (process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true') {
    return (
      <ContentContainer>
        <UnderDevelopment className='h-full' />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <PaginatedReport
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
