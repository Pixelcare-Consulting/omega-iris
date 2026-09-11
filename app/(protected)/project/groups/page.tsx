import { getPgs } from '@/actions/project-group'
import ContentContainer from '../../_components/content-container'
import ProjectGroupTable from './_components/project-group-table'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function ProjectGroupsPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const projectGroups = dbCode ? await getPgs(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <ProjectGroupTable projectGroups={projectGroups} />
    </ContentContainer>
  )
}
