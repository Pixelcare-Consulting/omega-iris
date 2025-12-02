import { getPgs } from '@/actions/project-group'
import ContentContainer from '../../_components/content-container'
import ProjectGroupTable from './_components/project-group-table'

export default async function ProjectGroupsPage() {
  const projectGroups = await getPgs()

  return (
    <ContentContainer>
      <ProjectGroupTable projectGroups={projectGroups} />
    </ContentContainer>
  )
}
