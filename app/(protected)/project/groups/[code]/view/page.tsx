import { notFound } from 'next/navigation'

import { getPgByCode } from '@/actions/project-group'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewProjectGroup from './_components/view-project-group'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function ProjectGroupViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const projectGroup = dbCode ? await getPgByCode(dbCode, parseInt(code), userInfo) : null

  if (!projectGroup) notFound()

  return (
    <ContentContainer>
      <ViewProjectGroup projectGroup={projectGroup} />
    </ContentContainer>
  )
}
