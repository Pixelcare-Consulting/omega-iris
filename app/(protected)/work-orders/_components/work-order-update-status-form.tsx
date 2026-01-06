'use client'

import { Item } from 'devextreme-react/toolbar'
import { Button } from 'devextreme-react/button'
import ScrollView from 'devextreme-react/scroll-view'

import { WORK_ORDER_STATUS_OPTIONS, WorkOrderStatusUpdateForm } from '@/schema/work-order'
import { FormProvider, useFormContext } from 'react-hook-form'
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

type WorkOrderUpdateStatusFormProps = {
  selectedRowKeys: number[]
  onClose?: () => void
}

export default function WorkOrderUpdateStatusForm({ selectedRowKeys, onClose }: WorkOrderUpdateStatusFormProps) {
  const router = useRouter()

  const form = useFormContext<WorkOrderStatusUpdateForm>()

  const { executeAsync, isExecuting } = useAction(updateWorkeOrderStatus)

  const handleOnSubmit = async (formData: WorkOrderStatusUpdateForm) => {
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
              onClick={() => form.handleSubmit(handleOnSubmit)()}
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
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField
                  control={form.control}
                  name='comments'
                  label='Comments'
                  isAutoResize
                  extendedProps={{ textAreaOptions: { maxHeight: 100 } }}
                />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </div>
    </FormProvider>
  )
}
