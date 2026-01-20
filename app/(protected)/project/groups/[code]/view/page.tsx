import { notFound } from 'next/navigation'

import { getPgByCode } from '@/actions/project-group'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewProjectGroup from './_components/view-project-group'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function ProjectGroupViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const projectGroup = await getPgByCode(parseInt(code), userInfo)

  if (!projectGroup) notFound()

  return (
    <ContentContainer>
      <ViewProjectGroup projectGroup={projectGroup} />
    </ContentContainer>
  )
}
