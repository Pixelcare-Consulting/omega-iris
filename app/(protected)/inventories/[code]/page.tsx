import { notFound } from 'next/navigation'

import { getInventoryByCode } from '@/actions/inventory'
import ContentContainer from '@/app/(protected)/_components/content-container'
import InventoryForm from '../_components/inventory-form'

export default async function InventoryPage({ params }: { params: { code: string } }) {
  const { code } = params

  const inventory = await getInventoryByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!inventory || !inventory?.code || code == 'add')
      return { title: 'Add Inventory', description: 'Fill in the form to create a new inventory.' }
    return { title: 'Edit Inventory', description: "Edit the form to update this inventory's information." }
  }

  if (code !== 'add' && !inventory) notFound()

  return (
    <ContentContainer>
      <InventoryForm pageMetaData={getPageMetadata()} inventory={inventory} />
    </ContentContainer>
  )
}
