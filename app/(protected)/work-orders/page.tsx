import { getWorkOrders } from '@/actions/work-order'
import ContentContainer from '../_components/content-container'
import WorkOrderTable from './_components/work-order-table'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function WorkOrdersPage() {
  const userInfo = await getCurrentUserAbility()
  const workOrders = await getWorkOrders(userInfo)

  return (
    <ContentContainer>
      <WorkOrderTable workOrders={workOrders} />
    </ContentContainer>
  )
}
