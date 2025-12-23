import { notFound } from 'next/navigation'

import { getBpByCode } from '@/actions/business-partner'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewCustomer from './_components/view-customer'

export default async function CustomerViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const customer = await getBpByCode(parseInt(code))

  if (!customer) notFound()

  return (
    <ContentContainer>
      <ViewCustomer customer={customer} />
    </ContentContainer>
  )
}
