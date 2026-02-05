import { notFound } from 'next/navigation'

import { getBpByCode } from '@/actions/business-partner'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewCustomer from './_components/view-customer'

export default async function SupplierViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const supplier = await getBpByCode(parseInt(code))

  if (!supplier) notFound()

  return (
    <ContentContainer>
      <ViewCustomer supplier={supplier} />
    </ContentContainer>
  )
}
