import { notFound } from 'next/navigation'

import { getWorkOrderByCode } from '@/actions/work-order'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewWorkOrder from './_components/view-work-order'
import { getCurrentUserAbility } from '@/actions/auth'
import { getReportByCode } from '@/actions/report'

export default async function WorkOrderViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const [workOrder, report] = await Promise.all([
    getWorkOrderByCode(parseInt(code), userInfo),
    getReportByCode(parseInt(process.env.WORK_ORDER_DEFAULT_REPORT_CODE!)),
  ])

  if (!workOrder) notFound()

  return (
    <ContentContainer>
      <ViewWorkOrder workOrder={workOrder} report={report} />
    </ContentContainer>
  )
}
