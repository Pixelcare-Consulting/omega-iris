import { notFound } from 'next/navigation'

import ContentContainer from '@/app/(protected)/_components/content-container'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'
import { getAllProjectItemByCode } from '@/actions/project-item'
import ViewProjectInventory from './_components/view-project-inventory'

export default async function ProjectInventoryViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const projectItem = dbCode ? await getAllProjectItemByCode(dbCode, parseInt(code), userInfo) : null

  if (!projectItem) notFound()

  return (
    <ContentContainer>
      <ViewProjectInventory projectItem={projectItem} />
    </ContentContainer>
  )
}
