import { notFound } from 'next/navigation'

import { getWorkOrderByCode } from '@/actions/work-order'
import ContentContainer from '@/app/(protected)/_components/content-container'
import WorkOrderForm from '../_components/work-order-form'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function WorkOrderPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const workOrder = await getWorkOrderByCode(parseInt(code), userInfo)

  const getPageMetadata = () => {
    if (!workOrder || !workOrder?.code || code == 'add') {
      return { title: 'Add Work Order', description: 'Fill in the form to create a new work order.' }
    }
    return { title: 'Edit Work Order', description: "Edit the form to update this work order's information." }
  }

  if (code !== 'add' && !workOrder) notFound()

  return (
    <ContentContainer>
      <WorkOrderForm pageMetaData={getPageMetadata()} workOrder={workOrder} />
    </ContentContainer>
  )
}
