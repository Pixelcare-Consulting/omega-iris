import { getPgs } from '@/actions/project-group'
import ContentContainer from '../../_components/content-container'
import ProjectGroupTable from './_components/project-group-table'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function ProjectGroupsPage() {
  const userInfo = await getCurrentUserAbility()
  const projectGroups = await getPgs(userInfo)

  return (
    <ContentContainer>
      <ProjectGroupTable projectGroups={projectGroups} />
    </ContentContainer>
  )
}
