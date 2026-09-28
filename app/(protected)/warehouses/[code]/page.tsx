import { notFound } from 'next/navigation'

import { getWarehouseByCode } from '@/actions/warehouse'
import ContentContainer from '@/app/(protected)/_components/content-container'
import WarehouseForm from '../_components/warehouse-form'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'
import { isCustomTfsEnabled } from '@/utils/sap-database-access'

export default async function WarehousePage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()

  //* the module only exists while the custom tfs process is on, middleware can be bypassed
  if (!(await isCustomTfsEnabled(dbCode))) notFound()

  const warehouse = dbCode ? await getWarehouseByCode(dbCode, parseInt(code), userInfo) : null

  const getPageMetadata = () => {
    if (!warehouse || !warehouse?.code || code == 'add')
      return { title: 'Add Warehouse', description: 'Fill in the form to create a new warehouse.' }
    return { title: 'Edit Warehouse', description: "Edit the form to update this warehouse's information." }
  }

  if (code !== 'add' && !warehouse) notFound()

  return (
    <ContentContainer>
      <WarehouseForm pageMetaData={getPageMetadata()} warehouse={warehouse} />
    </ContentContainer>
  )
}
