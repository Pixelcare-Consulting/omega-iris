import { notFound } from 'next/navigation'

import { getItemByCode } from '@/actions/item'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ItemForm from '../_components/item-form'

export default async function InventoryPage({ params }: { params: { code: string } }) {
  const { code } = params

  const item = await getItemByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!item || !item?.code || code == 'add') return { title: 'Add Item', description: 'Fill in the form to create a new item.' }
    return { title: 'Edit Item', description: "Edit the form to update this item's information." }
  }

  if (code !== 'add' && !item) notFound()

  return (
    <ContentContainer>
      <ItemForm pageMetaData={getPageMetadata()} item={item} />
    </ContentContainer>
  )
}
