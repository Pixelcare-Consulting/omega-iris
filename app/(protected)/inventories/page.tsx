import { getInventories } from '@/actions/inventory'
import ContentContainer from '../_components/content-container'
import InventoryTable from './_components/invetory-table'

export default async function InventoriesPage() {
  const inventories = await getInventories()

  return (
    <ContentContainer>
      <InventoryTable inventories={inventories} />
    </ContentContainer>
  )
}
