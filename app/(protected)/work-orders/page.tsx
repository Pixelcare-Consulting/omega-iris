import { getWorkOrders } from '@/actions/work-order'
import ContentContainer from '../_components/content-container'
import WorkOrderTable from './_components/work-order-table'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function WorkOrdersPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const workOrders = dbCode ? await getWorkOrders(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <WorkOrderTable workOrders={workOrders} />
    </ContentContainer>
  )
}
