import { getBps } from '@/actions/business-partner'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '../_components/content-container'
import CustomerTable from './_components/customer-table'

export default async function CustomerPage() {
  const dbCode = await getTenantDbCode()
  const bps = dbCode ? await getBps(dbCode, ['L', 'C']) : []

  return (
    <ContentContainer>
      <CustomerTable bps={bps} />
    </ContentContainer>
  )
}
