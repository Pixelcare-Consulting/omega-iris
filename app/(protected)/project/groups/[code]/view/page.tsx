import { notFound } from 'next/navigation'

import { getPgByCode } from '@/actions/project-group'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewProjectGroup from './_components/view-project-group'

export default async function ProjectGroupViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const projectGroup = await getPgByCode(parseInt(code))

  if (!projectGroup) notFound()

  return (
    <ContentContainer>
      <ViewProjectGroup projectGroup={projectGroup} />
    </ContentContainer>
  )
}
