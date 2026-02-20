'use client'

import { Item } from 'devextreme-react/toolbar'
import { Button } from 'devextreme-react/button'
import ScrollView from 'devextreme-react/scroll-view'

import { WORK_ORDER_STATUS_OPTIONS, WORK_ORDER_STATUS_VALUE_MAP, WorkOrderStatusUpdateForm } from '@/schema/work-order'
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
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AlertDialog from '@/components/alert-dialog'
import { safeParseInt } from '@/utils'
import { NotificationContext } from '@/context/notification'

type WorkOrderUpdateStatusFormProps = {
  selectedRowKeys: number[]
  isOpen?: boolean
  onClose?: () => void
  filterStatus?: number
  callback?: () => void
  isRedirect?: boolean //* isRedirect means its a single work order update which was done inside work order form not in work order table
  isStatusError?: boolean
}

export default function WorkOrderUpdateStatusForm({
  selectedRowKeys,
  isOpen,
  onClose,
  filterStatus,
  callback,
  isRedirect,
  isStatusError,
}: WorkOrderUpdateStatusFormProps) {
  const router = useRouter()

  // const notificationContext = useContext(NotificationContext)

  const form = useFormContext<WorkOrderStatusUpdateForm>()

  const [showConfirmation, setShowConfirmation] = useState(false)

  const currentStatus = useWatch({ control: form.control, name: 'currentStatus' })
  const workOrders = useWatch({ control: form.control, name: 'workOrders' }) || []

  const { executeAsync, isExecuting } = useAction(updateWorkeOrderStatus)

  const filteredWorkOrderStatusOptions = useMemo(() => {
    if (filterStatus === undefined) return []

    const options: { label: string; value: string }[] = []

    const CURRENT_STATUS = filterStatus
    const NEXT_STATUS = ++filterStatus

    const DEFAULT_ALLOWED_STATUSES = WORK_ORDER_STATUS_OPTIONS.filter((s) => {
      const status = safeParseInt(s.value)
      return status === WORK_ORDER_STATUS_VALUE_MAP['Cancelled'] || status === WORK_ORDER_STATUS_VALUE_MAP['Deleted']
    })

    //* append all allowed statuses based on conditions

    //* if CURRENT_STATUS is below to 'Verified' just append the option based on NEXT_STATUS
    //* set form value to NEXT_STATUS
    if (CURRENT_STATUS < WORK_ORDER_STATUS_VALUE_MAP['Verified']) {
      options.push(
        ...WORK_ORDER_STATUS_OPTIONS.filter((s) => {
          const status = safeParseInt(s.value)
          return status === NEXT_STATUS
        })
      )
    }

    //* if CURRENT_STATUS is 'Verified' or 'Partial Delivery' then append the option 'Partial Delivery' and 'Delivered'
    if (CURRENT_STATUS === WORK_ORDER_STATUS_VALUE_MAP['Verified'] || CURRENT_STATUS === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery']) {
      options.push(
        ...WORK_ORDER_STATUS_OPTIONS.filter((s) => {
          const status = safeParseInt(s.value)
          return status === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'] || status === WORK_ORDER_STATUS_VALUE_MAP['Delivered']
        })
      )
    }

    //* append all default allowed statuses
    options.push(...DEFAULT_ALLOWED_STATUSES)

    return options
  }, [JSON.stringify(filterStatus)])

  const filteredWorkOrderStatuses = useMemo(() => {
    return filteredWorkOrderStatusOptions.map((s) => `"${s.label}"`)
  }, [JSON.stringify(filteredWorkOrderStatusOptions)])

  function formatFilteredWorkOrderStatuses(statuses: string[]) {
    if (statuses.length === 0) return ''
    if (statuses.length === 1) return statuses[0]
    if (statuses.length === 2) return statuses.join(' or ')

    return statuses.slice(0, -1).join(', ') + ', or ' + statuses[statuses.length - 1]
  }

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
            // notificationContext?.handleRefresh()

            if (callback) callback()
            if (isRedirect) {
              const workOrder = result?.data?.workOrders[0]
              const appliedStatus = safeParseInt(result.data.appliedStatus)

              if (appliedStatus < 6) router.replace(`/work-orders/${workOrder.code}`)
              else router.replace(`/work-orders`)
            }
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

  //* auto select current status
  useEffect(() => {
    if (!isOpen || isStatusError) return

    //? filterStatus can be the current status of the work order or the selected work orders
    if (filterStatus !== undefined && filteredWorkOrderStatusOptions.length > 0) {
      if (filterStatus < WORK_ORDER_STATUS_VALUE_MAP['Verified']) {
        //* just set the first options which also the next status of the work order
        form.setValue('currentStatus', filteredWorkOrderStatusOptions[0].value)
        return
      }

      if (filterStatus === WORK_ORDER_STATUS_VALUE_MAP['Verified']) {
        //* set as delivered status option
        const option = filteredWorkOrderStatusOptions.find((s) => safeParseInt(s.value) === WORK_ORDER_STATUS_VALUE_MAP['Delivered'])
        if (option) {
          form.setValue('currentStatus', option.value)
          return
        }
      }

      if (filterStatus === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery']) {
        //* set as partial delivery status option
        const option = filteredWorkOrderStatusOptions.find((s) => safeParseInt(s.value) === WORK_ORDER_STATUS_VALUE_MAP['Partial Delivery'])
        if (option) {
          form.setValue('currentStatus', option.value)
          return
        }
      }
    }
  }, [filterStatus, filteredWorkOrderStatusOptions, isOpen, isStatusError])

  return (
    <FormProvider {...form}>
      <div className='flex h-fit w-full flex-col gap-3'>
        <PageHeader
          title='Update Work Order Status'
          description='Update the status of the selected work orders'
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={onClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              icon='save'
              isLoading={isExecuting}
              disabled={!currentStatus || isStatusError}
              onClick={() => setShowConfirmation(true)}
            />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5'>
              {!isStatusError ? (
                <Alert
                  className='col-span-12'
                  variant='default'
                  message={`Work order(s) current status: "${WORK_ORDER_STATUS_OPTIONS.find((s) => safeParseInt(s.value) === filterStatus)?.label}." You can only update the status to ${formatFilteredWorkOrderStatuses(filteredWorkOrderStatuses)}`}
                />
              ) : (
                <>
                  <Alert className='col-span-12' variant='error' message={`Selected work order(s) must have the same status to proceed.`} />

                  <Alert
                    className='col-span-12'
                    variant='default'
                    message={`Please make sure that the following work order(s) have the same status: ${selectedRowKeys.join(', ')}.`}
                  />
                </>
              )}

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Date & Time' value={format(new Date(), 'MM/dd/yyyy hh:mm a')} />

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={filteredWorkOrderStatusOptions}
                  control={form.control}
                  name='currentStatus'
                  label='Status'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                  callback={currentStatusCallback}
                  extendedProps={{
                    selectBoxOptions: { disabled: isStatusError },
                  }}
                />
              </div>

              {(currentStatus === '5' || currentStatus === '6') && (
                <div className='col-span-12'>
                  <TextAreaField
                    control={form.control}
                    name='trackingNum'
                    label='Tracking Number'
                    isAutoResize
                    extendedProps={{ textAreaOptions: { maxHeight: 150, disabled: isStatusError } }}
                  />
                </div>
              )}

              <div className='col-span-12'>
                <TextAreaField
                  control={form.control}
                  name='comments'
                  label='Comments'
                  isAutoResize
                  extendedProps={{ textAreaOptions: { maxHeight: 150, disabled: isStatusError } }}
                />
              </div>

              {!isStatusError && currentStatus === '5' && (
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
