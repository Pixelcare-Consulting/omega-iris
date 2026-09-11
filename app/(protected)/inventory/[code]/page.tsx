import { notFound } from 'next/navigation'

import { getItemByCode } from '@/actions/item'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ItemForm from '../_components/item-form'

export default async function InventoryPage({ params }: { params: { code: string } }) {
  const { code } = params

  const dbCode = await getTenantDbCode()
  const item = dbCode ? await getItemByCode(dbCode, parseInt(code)) : null

  const getPageMetadata = () => {
    if (!item || !item?.code || code == 'add')
      return { title: 'Add Item Master', description: 'Fill in the form to create a new item master.' }
    return { title: 'Edit Item Master', description: "Edit the form to update this item master's information." }
  }

  if (code !== 'add' && !item) notFound()

  return (
    <ContentContainer>
      <ItemForm pageMetaData={getPageMetadata()} item={item} />
    </ContentContainer>
  )
}
