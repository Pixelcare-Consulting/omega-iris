import { notFound } from 'next/navigation'

import { getWarehouses } from '@/actions/warehouse'
import ContentContainer from '../_components/content-container'
import WarehouseTable from './_components/warehouse-table'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'
import { isCustomTfsEnabled } from '@/utils/sap-database-access'

export default async function WarehousesPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()

  //* the module only exists while the custom tfs process is on, middleware can be bypassed
  if (!(await isCustomTfsEnabled(dbCode))) notFound()

  const warehouses = dbCode ? await getWarehouses(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <WarehouseTable warehouses={warehouses} />
    </ContentContainer>
  )
}
