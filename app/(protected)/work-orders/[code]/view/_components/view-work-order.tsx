'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getWorkOrderByCode } from '@/actions/work-order'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import WorkOrderOverviewTab from './_tabs/work-order-overview-tab'
import UnderDevelopment from '@/app/under-development'
import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import WorkOrderLineItemTab from './_tabs/work-order-line-item-tab'
import { useWoStatusUpdatesByWoCode } from '@/hooks/safe-actions/work-order-status-update'
import WorkOrderStatusUpdateTab from './_tabs/work-order-status-update-tab'
import { useSalesOrderByWorkOrderCode } from '@/hooks/safe-actions/sales-order'
import { useAddressById } from '@/hooks/safe-actions/address'
import CanView from '@/components/acl/can-view'
import { safeParseInt } from '@/utils'
import { useFileAttachmentsByRefCode } from '@/hooks/safe-actions/file-attachment'
import WorkOrderAttachmentTab from './_tabs/work-order-attachment-tab'
import { useReportByCode } from '@/hooks/safe-actions/report'
import WorkOrderReportViewerTab from './_tabs/work-order-report-viewer-tab'
import { getReportByCode } from '@/actions/report'

type ViewWorkOrderProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  report: Awaited<ReturnType<typeof getReportByCode>>
}

export default function ViewWorkOrder({ workOrder, report }: ViewWorkOrderProps) {
  const router = useRouter()

  const status = safeParseInt(workOrder.status)
  const workOrderItems = useWoItemsByWoCode(workOrder?.code)
  const workOrderStatusUpdates = useWoStatusUpdatesByWoCode(workOrder?.code)
  const salesOrder = useSalesOrderByWorkOrderCode(workOrder?.code)
  const billingAddress = useAddressById(workOrder?.billingAddrCode ?? '')
  const shippingAddress = useAddressById(workOrder?.shippingAddrCode ?? '')
  const fileAttachments = useFileAttachmentsByRefCode('work-orders', workOrder?.code)

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Work Order Details' description='View the comprehensive details of this work order.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/work-orders')}
          />
        </Item>

        <CanView subject='p-work-orders' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/work-orders/add`) }}
          />
        </CanView>

        {status < 6 && (
          <CanView subject='p-work-orders' action='edit'>
            <Item
              location='after'
              locateInMenu='always'
              widget='dxButton'
              options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/work-orders/${workOrder.code}`) }}
            />
          </CanView>
        )}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_150px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <WorkOrderOverviewTab
              workOrder={workOrder}
              salesOrder={salesOrder}
              billingAddress={billingAddress}
              shippingAddress={shippingAddress}
            />
          </TabPanelITem>

          <TabPanelITem title='Line Items'>
            <WorkOrderLineItemTab workOrder={workOrder} workOrderItems={workOrderItems} />
          </TabPanelITem>

          <TabPanelITem title='Status Updates'>
            <WorkOrderStatusUpdateTab workOrder={workOrder} statusUpdates={workOrderStatusUpdates} />
          </TabPanelITem>

          <TabPanelITem title='Attachments'>
            <WorkOrderAttachmentTab workOrder={workOrder} fileAttachments={fileAttachments} />
          </TabPanelITem>

          <TabPanelITem title='Report'>
            <WorkOrderReportViewerTab workOrder={workOrder} report={report} />
          </TabPanelITem>

          {/* <TabPanelITem title='Sales Order'>
            <UnderDevelopment className='h-[60vh]' />
          </TabPanelITem> */}
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
