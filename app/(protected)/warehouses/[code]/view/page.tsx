import { notFound } from 'next/navigation'

import { getWarehouseByCode } from '@/actions/warehouse'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewWarehouse from './_components/view-warehouse'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function WarehouseViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const warehouse = dbCode ? await getWarehouseByCode(dbCode, parseInt(code), userInfo) : null

  if (!warehouse) notFound()

  return (
    <ContentContainer>
      <ViewWarehouse warehouse={warehouse} />
    </ContentContainer>
  )
}
