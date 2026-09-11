import { notFound } from 'next/navigation'

import { getBpByCode } from '@/actions/business-partner'
import { getTenantDbCode } from '@/utils/tenant'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewCustomer from './_components/view-supplier'

export default async function SupplierViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const dbCode = await getTenantDbCode()
  const supplier = dbCode ? await getBpByCode(dbCode, parseInt(code)) : null

  if (!supplier) notFound()

  return (
    <ContentContainer>
      <ViewCustomer supplier={supplier} />
    </ContentContainer>
  )
}
