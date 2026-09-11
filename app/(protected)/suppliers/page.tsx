import { getBps } from '@/actions/business-partner'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '../_components/content-container'
import SupplierTable from './_components/supplier-table'

export default async function SuppliersPage() {
  const dbCode = await getTenantDbCode()
  const bps = dbCode ? await getBps(dbCode, 'S') : []

  return (
    <ContentContainer>
      <SupplierTable bps={bps} />
    </ContentContainer>
  )
}
