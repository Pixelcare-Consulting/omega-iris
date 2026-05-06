'use client'

import LoadPanel from 'devextreme-react/load-panel'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import PageHeader from '@/app/(protected)/_components/page-header'

import { useWoStatusUpdatesByWoCode } from '@/hooks/safe-actions/work-order-status-update'
import { getWoStatusUpdatesByWoCode } from '@/actions/work-order-status-update'
import {
  type PartialWorkOrderStatusUpdateForm,
  partialWorkOrderStatusUpdateFormSchema,
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_VALUE_MAP,
} from '@/schema/work-order'
import { format } from 'date-fns'
import { useUserById } from '@/hooks/safe-actions/user'
import TooltipWrapper from '@/components/tooltip-wrapper'
import LoadingButton from '@/components/loading-button'
import { useAction } from 'next-safe-action/hooks'
import { getWorkOrderByCode, updatePartialWorkOrderStatusUpdate } from '@/actions/work-order'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ReadOnlyField from '@/components/read-only-field'
import TextAreaField from '@/components/forms/text-area-field'
import { safeParseInt } from '@/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Popup from 'devextreme-react/popup'
import CanView from '@/components/acl/can-view'

type WorkOrderStatusUpdateTabProps = {
  statusUpdates: ReturnType<typeof useWoStatusUpdatesByWoCode>
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
}

export default function WorkOrderStatusUpdateTab({ workOrder, statusUpdates }: WorkOrderStatusUpdateTabProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>[number] | null>(null)
  const [statusUpdatesWithInitialUpdate, setStatusUpdatesWithInitialUpdate] = useState<Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>>([]) //prettier-ignore

  useEffect(() => {
    if (workOrder && !statusUpdates.isLoading) {
      const initialUpdate = {
        id: 'initial',
        code: -1,
        createdAt: workOrder.createdAt,
        updatedAt: workOrder.createdAt,
        createdBy: workOrder.createdBy,
        updatedBy: workOrder.createdBy,
        comments: workOrder.comments,
        workOrderCode: workOrder.code,
        prevStatus: '',
        currentStatus: '1',
        trackingNum: null,
      }

      const updatedData = [...statusUpdates.data, initialUpdate]
      setStatusUpdatesWithInitialUpdate(updatedData)
    }
  }, [statusUpdates.data, statusUpdates.isLoading, workOrder])

  if (statusUpdates.isLoading)
    return (
      <div id='work-order-line-item-view-loading' className='relative mt-4 flex h-[60vh] w-full items-center justify-center'>
        <LoadPanel
          container='#work-order-line-item-view-loading'
          shadingColor='rgb(241, 245, 249)'
          position={{ of: containerRef?.current as any, at: 'center', my: 'center', offset: { x: 110, y: 55 } }}
          message='Loading data...'
          visible
          showIndicator
          showPane
          shading
        />
      </div>
    )

  return (
    <ScrollView useNative>
      <div className='mt-4 flex h-full w-full flex-col gap-3'>
        {statusUpdatesWithInitialUpdate.length > 0 ? (
          statusUpdatesWithInitialUpdate.map((update) => (
            <WorkOrderStatusUpdateCard
              workOrder={workOrder}
              statusUpdate={update}
              key={update.id}
              setIsOpen={setIsOpen}
              setData={setData}
            />
          ))
        ) : (
          <div className='flex h-[60vh] w-full items-center justify-center'>
            <div>
              <h1 className='text-center text-lg font-semibold'>No status updates yet!</h1>
              <p className='text-center text-sm text-slate-400'>There are no status updates for this work order.</p>
            </div>
          </div>
        )}
      </div>

      {data && (
        <Popup
          visible={isOpen}
          dragEnabled={false}
          showTitle={false}
          onHiding={() => setIsOpen(false)}
          maxWidth={700}
          height={safeParseInt(data.currentStatus) < WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'] ? 420 : 500}
        >
          <PartialWorkOrderStatusUpdateForm
            workOrderCode={workOrder.code}
            statusUpdates={statusUpdates}
            setIsOpen={setIsOpen}
            data={data}
          />
        </Popup>
      )}
    </ScrollView>
  )
}

type WorkOrderStatusUpdateCardProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  statusUpdate: Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>[number]
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  setData: React.Dispatch<React.SetStateAction<Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>[number] | null>>
}

function WorkOrderStatusUpdateCard({ workOrder, statusUpdate, setIsOpen, setData }: WorkOrderStatusUpdateCardProps) {
  const prevStatus = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === statusUpdate?.prevStatus)?.label
  const currentStatus = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === statusUpdate?.currentStatus)?.label

  const createdAt = format(statusUpdate.createdAt, 'MMM dd,yyyy hh:mm a')
  const createdBy = useUserById(statusUpdate.createdBy)

  const updatedAt = format(statusUpdate.updatedAt, 'MMM dd,yyyy hh:mm a')
  const updatedBy = useUserById(statusUpdate.updatedBy)

  const renderValue = (value: ReturnType<typeof useUserById>) => {
    if (value.isLoading) return '...'
    return `${value.data?.fname || ''}${value.data?.lname ? ` ${value.data?.lname}` : ''}`
  }

  const handleEdit = () => {
    setData(statusUpdate)
    setIsOpen(true)
  }

  return (
    <div className='flex items-center gap-3 rounded-md border bg-slate-50 p-4'>
      <div className='flex size-10 flex-shrink-0 items-center justify-center rounded-md border bg-white'>
        <i className='dx-icon-contentlayout text-2xl text-primary' />
      </div>

      <div className='flex w-full items-center justify-between gap-3'>
        <div className='flex flex-1 flex-col gap-1'>
          <h1 className='text-lg'>
            Status Changed from "<span className='font-bold uppercase'>{prevStatus || 'N/A'}</span>" to "
            <span className='font-bold uppercase'>{currentStatus || 'N/A'}</span>"
          </h1>
          <p className='text-slate-500'>
            Created:{' '}
            {createdBy && (
              <span className='font-semibold'>
                {createdAt} {createdBy.data && `By  ${renderValue(createdBy)}`}
              </span>
            )}
          </p>
          <p className='text-slate-500'>
            Updated:{' '}
            <span className='font-semibold'>
              {updatedAt} {updatedBy.data && `By  ${renderValue(updatedBy)}`}
            </span>
          </p>

          {(safeParseInt(statusUpdate.currentStatus) === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'] ||
            safeParseInt(statusUpdate.currentStatus) === WORK_ORDER_STATUS_VALUE_MAP['Delivered']) && (
            <p className='whitespace-pre-line text-slate-500'>Tracking Number: {statusUpdate?.trackingNum || 'N/A'}</p>
          )}

          {statusUpdate.code === -1 && <p className='whitespace-pre-line text-slate-500'>Customer PO: {workOrder?.customerPo || 'N/A'}</p>}

          <p className='whitespace-pre-line text-slate-500'>Comment: {statusUpdate?.comments || 'N/A'}</p>
        </div>

        <div>
          <CanView subject='p-work-orders' action='update status'>
            <TooltipWrapper label='Edit' targetId='edit-button'>
              <Button icon='edit' stylingMode='contained' type='default' onClick={handleEdit} disabled={statusUpdate.code === -1} />
            </TooltipWrapper>
          </CanView>
        </div>
      </div>
    </div>
  )
}

type PartialStatusUpdateFormProps = {
  workOrderCode: number
  setIsOpen: Dispatch<SetStateAction<boolean>>
  data: Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>[number]
  statusUpdates: ReturnType<typeof useWoStatusUpdatesByWoCode>
}

function PartialWorkOrderStatusUpdateForm({ workOrderCode, setIsOpen, data, statusUpdates }: PartialStatusUpdateFormProps) {
  const router = useRouter()

  const form = useForm({
    mode: 'onChange',
    values: {
      code: data.code,
      currentStatus: data.currentStatus,
      comments: data.comments,
      trackingNum: data.trackingNum,
    },
    resolver: zodResolver(partialWorkOrderStatusUpdateFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updatePartialWorkOrderStatusUpdate)

  const createdBy = useUserById(data.createdBy)
  const updatedBy = useUserById(data.updatedBy)
  const createdAt = format(data.createdAt, 'MMM dd,yyyy hh:mm a')
  const updatedAt = format(data.updatedAt, 'MMM dd,yyyy hh:mm a')

  const status = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === data.currentStatus)?.label

  const handleOnSubmit = async (formData: PartialWorkOrderStatusUpdateForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.status === 200) {
        handleClose()
        router.refresh()
        statusUpdates.execute({ workOrderCode })
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleClose = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
    setIsOpen(false)
  }

  const renderValue = (value: ReturnType<typeof useUserById>) => {
    if (!value?.data) return ''

    if (value.isLoading) return '...'
    return `${value.data?.fname || ''}${value.data?.lname ? ` ${value.data?.lname}` : ''}`
  }

  return (
    <FormProvider {...form}>
      <form className='flex h-fit w-full flex-col gap-3' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader
          title='Update Work Order Status'
          description='Update the status of the selected work orders'
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={handleClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              icon='save'
              useSubmitBehavior
              isLoading={isExecuting}
              disabled={isExecuting}
            />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView useNative>
            <div className='grid h-full grid-cols-12 gap-5'>
              <ReadOnlyField className='col-span-12 md:col-span-6' title='Work Order' value={data.workOrderCode} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Status' value={status || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Created At' value={createdAt || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Created By' value={renderValue(createdBy) || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Updated At' value={updatedAt || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Updated By' value={renderValue(updatedBy) || ''} />

              {(safeParseInt(data.currentStatus) === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'] ||
                safeParseInt(data.currentStatus) === WORK_ORDER_STATUS_VALUE_MAP['Delivered']) && (
                <div className='col-span-12'>
                  <TextAreaField
                    control={form.control}
                    name='trackingNum'
                    label='Tracking Number'
                    isAutoResize
                    extendedProps={{ textAreaOptions: { maxHeight: 150 } }}
                  />
                </div>
              )}

              <div className='col-span-12'>
                <TextAreaField
                  control={form.control}
                  name='comments'
                  label='Comments'
                  isAutoResize
                  extendedProps={{ textAreaOptions: { maxHeight: 150 } }}
                />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
