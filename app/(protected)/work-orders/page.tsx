import { getWorkOrders } from '@/actions/work-order'
import ContentContainer from '../_components/content-container'
import WorkOrderTable from './_components/work-order-table'

export default async function WorkOrdersPage() {
  const workOrders = await getWorkOrders()

  return (
    <ContentContainer>
      <WorkOrderTable workOrders={workOrders} />
    </ContentContainer>
  )
}
