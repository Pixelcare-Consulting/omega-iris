import { notFound } from 'next/navigation'

import { getItemByCode } from '@/actions/item'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewItem from './_components/view-item'

export default async function InventoryViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const dbCode = await getTenantDbCode()
  const item = dbCode ? await getItemByCode(dbCode, parseInt(code)) : null

  if (!item) notFound()

  return (
    <ContentContainer>
      <ViewItem item={item} />
    </ContentContainer>
  )
}
