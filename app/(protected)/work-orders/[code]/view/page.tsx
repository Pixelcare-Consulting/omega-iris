import { notFound } from 'next/navigation'

import { getWorkOrderByCode } from '@/actions/work-order'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewWorkOrder from './_components/view-work-order'

export default async function WorkOrderViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const workOrder = await getWorkOrderByCode(parseInt(code))

  if (!workOrder) notFound()

  return (
    <ContentContainer>
      <ViewWorkOrder workOrder={workOrder} />
    </ContentContainer>
  )
}
