import { getItems } from '@/actions/item'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '../_components/content-container'
import ItemTable from './_components/item-table'

export default async function InventoryPage() {
  const dbCode = await getTenantDbCode()
  const items = dbCode ? await getItems(dbCode) : []

  return (
    <ContentContainer>
      <ItemTable items={items} />
    </ContentContainer>
  )
}
