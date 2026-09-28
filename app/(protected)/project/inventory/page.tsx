import ContentContainer from '../../_components/content-container'
import { getAllProjectItems } from '@/actions/project-item'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'
import ProjectInventoryTable from './_components/project-inventory-table'

export default async function ProjectInventoryPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const allProjectItems = dbCode ? await getAllProjectItems(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <ProjectInventoryTable allProjectItems={allProjectItems} />
    </ContentContainer>
  )
}
