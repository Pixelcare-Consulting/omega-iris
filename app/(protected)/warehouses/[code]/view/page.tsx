import { notFound } from 'next/navigation'

import { getWarehouseByCode } from '@/actions/warehouse'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewWarehouse from './_components/view-warehouse'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function WarehouseViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const warehouse = await getWarehouseByCode(parseInt(code), userInfo)

  if (!warehouse) notFound()

  return (
    <ContentContainer>
      <ViewWarehouse warehouse={warehouse} />
    </ContentContainer>
  )
}
