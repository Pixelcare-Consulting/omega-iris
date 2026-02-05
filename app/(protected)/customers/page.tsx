import { getBps } from '@/actions/business-partner'
import ContentContainer from '../_components/content-container'
import CustomerTable from './_components/customer-table'

export default async function CustomerPage() {
  const bps = await getBps(['L', 'C'])

  return (
    <ContentContainer>
      <CustomerTable bps={bps} />
    </ContentContainer>
  )
}
