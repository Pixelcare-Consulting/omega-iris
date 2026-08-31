import { getWarehouses } from '@/actions/warehouse'
import ContentContainer from '../_components/content-container'
import WarehouseTable from './_components/warehouse-table'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function WarehousesPage() {
  const userInfo = await getCurrentUserAbility()
  const warehouses = await getWarehouses(userInfo)

  return (
    <ContentContainer>
      <WarehouseTable warehouses={warehouses} />
    </ContentContainer>
  )
}
