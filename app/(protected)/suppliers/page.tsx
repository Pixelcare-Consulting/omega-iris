import { getBps } from '@/actions/business-partner'
import ContentContainer from '../_components/content-container'
import SupplierTable from './_components/supplier-table'

export default async function SuppliersPage() {
  const bps = await getBps('S')

  return (
    <ContentContainer>
      <SupplierTable bps={bps} />
    </ContentContainer>
  )
}
