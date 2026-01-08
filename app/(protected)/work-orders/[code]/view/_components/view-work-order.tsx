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

type ViewWorkOrderProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
}

export default function ViewWorkOrder({ workOrder }: ViewWorkOrderProps) {
  const router = useRouter()

  const workOrderItems = useWoItemsByWoCode(workOrder?.code)
  const workOrderStatusUpdates = useWoStatusUpdatesByWoCode(workOrder?.code)
  const salesOrder = useSalesOrderByWorkOrderCode(workOrder?.code)
  const billingAddress = useAddressById(workOrder?.billingAddrCode ?? '')
  const shippingAddress = useAddressById(workOrder?.shippingAddrCode ?? '')

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

        <CanView subject='p-work-orders' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/work-orders/${workOrder.code}`) }}
          />
        </CanView>
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
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
            <WorkOrderStatusUpdateTab statusUpdates={workOrderStatusUpdates} />
          </TabPanelITem>

          {/* <TabPanelITem title='Sales Order'>
            <UnderDevelopment className='h-[60vh]' />
          </TabPanelITem> */}
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
