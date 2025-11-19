import { getProjectGroups } from '@/actions/project-group'
import ContentContainer from '../../_components/content-container'
import ProjectGroupTable from './_components/project-group-table'

export default async function ProjectGroupsPage() {
  const projectGroups = await getProjectGroups()

  return (
    <ContentContainer>
      <ProjectGroupTable projectGroups={projectGroups} />
    </ContentContainer>
  )
}
