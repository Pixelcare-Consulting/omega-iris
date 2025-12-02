import { getItems } from '@/actions/item'
import ContentContainer from '../_components/content-container'
import ItemTable from './_components/item-table'

export default async function InventoryPage() {
  const items = await getItems()

  return (
    <ContentContainer>
      <ItemTable items={items} />
    </ContentContainer>
  )
}
