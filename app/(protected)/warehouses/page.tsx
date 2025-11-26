import { getWarehouses } from '@/actions/warehouse'
import ContentContainer from '../_components/content-container'
import WarehouseTable from './_components/warehouse-table'

export default async function WarehousesPage() {
  const warehouses = await getWarehouses()

  return (
    <ContentContainer>
      <WarehouseTable warehouses={warehouses} />
    </ContentContainer>
  )
}
