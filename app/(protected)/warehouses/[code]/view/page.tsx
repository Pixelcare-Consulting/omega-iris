import { notFound } from 'next/navigation'

import { getWarehouseByCode } from '@/actions/warehouse'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewWarehouse from './_components/view-warehouse'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'
import { isCustomTfsEnabled } from '@/utils/sap-database-access'

export default async function WarehouseViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()

  //* the module only exists while the custom tfs process is on, middleware can be bypassed
  if (!(await isCustomTfsEnabled(dbCode))) notFound()

  const warehouse = dbCode ? await getWarehouseByCode(dbCode, parseInt(code), userInfo) : null

  if (!warehouse) notFound()

  return (
    <ContentContainer>
      <ViewWarehouse warehouse={warehouse} />
    </ContentContainer>
  )
}
