import { notFound } from 'next/navigation'

import { getItemByCode } from '@/actions/item'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewItem from './_components/view-item'

export default async function InventoryViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const item = await getItemByCode(parseInt(code))

  if (!item) notFound()

  return (
    <ContentContainer>
      <ViewItem item={item} />
    </ContentContainer>
  )
}
