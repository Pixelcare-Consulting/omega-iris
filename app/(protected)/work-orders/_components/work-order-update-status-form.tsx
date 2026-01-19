'use client'

import { Item } from 'devextreme-react/toolbar'
import { Button } from 'devextreme-react/button'
import ScrollView from 'devextreme-react/scroll-view'

import { WORK_ORDER_STATUS_OPTIONS, WorkOrderStatusUpdateForm } from '@/schema/work-order'
import { FormProvider, useFormContext, useWatch } from 'react-hook-form'
import PageHeader from '@/app/(protected)/_components/page-header'
import LoadingButton from '@/components/loading-button'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import SelectBoxField from '@/components/forms/select-box-field'
import ReadOnlyField from '@/components/read-only-field'
import { toast } from 'sonner'
import { updateWorkeOrderStatus } from '@/actions/work-order'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import Alert from '@/components/alert'
import TextAreaField from '@/components/forms/text-area-field'
import { useRouter } from 'next/navigation'
import { FormDebug } from '@/components/forms/form-debug'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import WorkOrderLineItemsTobeDeliver from './work-order-line-items-tobe-deliver'
import { useCallback, useEffect, useState } from 'react'
import AlertDialog from '@/components/alert-dialog'

type WorkOrderUpdateStatusFormProps = {
  selectedRowKeys: number[]
  onClose?: () => void
  setCurrentStatus: React.Dispatch<React.SetStateAction<string | undefined>>
}

export default function WorkOrderUpdateStatusForm({ selectedRowKeys, onClose, setCurrentStatus }: WorkOrderUpdateStatusFormProps) {
  const router = useRouter()

  const form = useFormContext<WorkOrderStatusUpdateForm>()

  const [showConfirmation, setShowConfirmation] = useState(false)

  const currentStatus = useWatch({ control: form.control, name: 'currentStatus' })
  const workOrders = useWatch({ control: form.control, name: 'workOrders' }) || []

  const { executeAsync, isExecuting } = useAction(updateWorkeOrderStatus)

  const handleOnSubmit = async (formData: WorkOrderStatusUpdateForm) => {
    setShowConfirmation(false)

    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.workOrders) {
        router.refresh()
        form.setValue('workOrders', [])

        if (onClose) {
          setTimeout(() => {
            onClose()
          }, 1000)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const currentStatusCallback = useCallback(
    (args: any) => {
      if (args.value !== '5') {
        form.setValue(
          'workOrders',
          workOrders.map((wo) => ({ ...wo, deliveredProjectItems: [] }))
        )
      }
    },
    [JSON.stringify(workOrders)]
  )

  useEffect(() => {
    setCurrentStatus(currentStatus)
  }, [currentStatus])

  return (
    <FormProvider {...form}>
      <div className='flex h-fit w-full flex-col gap-3'>
        <PageHeader
          title='Update Work Order Status'
          description='Update the status of the selected work orders'
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={onClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              icon='save'
              isLoading={isExecuting}
              disabled={!currentStatus}
              onClick={() => setShowConfirmation(true)}
            />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5'>
              <Alert
                className='col-span-12'
                variant='default'
                message={`Selected work orders with the same status or status is higher than the selected status will be ignored! Work order that will be updated: ${selectedRowKeys.join(', ')}`}
              />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Date & Time' value={format(new Date(), 'MM/dd/yyyy hh:mm a')} />

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={WORK_ORDER_STATUS_OPTIONS}
                  control={form.control}
                  name='currentStatus'
                  label='Status'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                  callback={currentStatusCallback}
                />
              </div>

              {(currentStatus === '5' || currentStatus === '6') && (
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

              {currentStatus === '5' && (
                <>
                  <Separator className='col-span-12' />
                  <ReadOnlyFieldHeader
                    className='col-span-12 mb-1'
                    title='Work Order Line Items (Partial Delivery)'
                    description='Toggle the delivered checkbox to mark the work order line items as delivered.'
                  />

                  <div className='col-span-12'>
                    <WorkOrderLineItemsTobeDeliver
                      workOrderCodes={workOrders.map((wo) => wo.code)}
                      showConfirmation={showConfirmation}
                      setShowConfirmation={setShowConfirmation}
                    />
                  </div>
                </>
              )}

              <AlertDialog
                isOpen={showConfirmation}
                title='Are you sure?'
                description={`Are you sure you want to update the status of the selected work order to "${WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label ?? ''}"?`}
                onConfirm={() => form.handleSubmit(handleOnSubmit)()}
                onCancel={() => setShowConfirmation(false)}
              />
            </div>
          </ScrollView>
        </PageContentWrapper>
      </div>
    </FormProvider>
  )
}
