import { notFound } from 'next/navigation'

import { getInventoryByCode } from '@/actions/inventory'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewInventory from './_components/view-intentory'

export default async function InventoryViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const inventory = await getInventoryByCode(parseInt(code))

  if (!inventory) notFound()

  return (
    <ContentContainer>
      <ViewInventory inventory={inventory} />
    </ContentContainer>
  )
}
