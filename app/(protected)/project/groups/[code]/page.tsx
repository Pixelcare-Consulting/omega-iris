import { notFound } from 'next/navigation'

import { getProjectGroupByCode } from '@/actions/project-group'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ProjectGroupForm from '../_components/project-group-form'

export default async function ProjectGroupPage({ params }: { params: { code: string } }) {
  const { code } = params

  const projectGroup = await getProjectGroupByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!projectGroup || !projectGroup?.code || code == 'add')
      return { title: 'Add Project Group', description: 'Fill in the form to create a new project group.' }
    return { title: 'Edit Project Group', description: "Edit the form to update this project group's information." }
  }

  if (code !== 'add' && !projectGroup) notFound()

  return (
    <ContentContainer>
      <ProjectGroupForm pageMetaData={getPageMetadata()} projectGroup={projectGroup} />
    </ContentContainer>
  )
}
