import { notFound } from 'next/navigation'

import { getBpByCode } from '@/actions/business-partner'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewCustomer from './_components/view-customer'

export default async function CustomerViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const dbCode = await getTenantDbCode()
  const customer = dbCode ? await getBpByCode(dbCode, parseInt(code)) : null

  if (!customer) notFound()

  return (
    <ContentContainer>
      <ViewCustomer customer={customer} />
    </ContentContainer>
  )
}
