import { getWarehouses } from '@/actions/warehouse'
import ContentContainer from '../_components/content-container'
import WarehouseTable from './_components/warehouse-table'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function WarehousesPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const warehouses = dbCode ? await getWarehouses(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <WarehouseTable warehouses={warehouses} />
    </ContentContainer>
  )
}
