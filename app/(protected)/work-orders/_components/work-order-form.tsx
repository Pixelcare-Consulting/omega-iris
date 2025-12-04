'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { WORK_ORDER_STATUS_OPTIONS, type WorkOrderForm, workOrderFormSchema } from '@/schema/work-order'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { getWorkOrderByCode, upsertWorkOrder } from '@/actions/work-order'
import { PageMetadata } from '@/types/common'
import SelectBoxField from '@/components/forms/select-box-field'
import TextAreaField from '@/components/forms/text-area-field'
import SwitchField from '@/components/forms/switch-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import { usePis } from '@/hooks/safe-actions/project-individual'
import { usePiCustomerByProjectCode } from '@/hooks/safe-actions/project-individual-customer'
import { useUserByCode } from '@/hooks/safe-actions/user'
import { commonItemRender } from '@/utils/devextreme'
import ReadOnlyField from '@/components/read-only-field'
import WorkOrderLineItemTable from './work-order-line-item-table'
import useDebug from '@/hooks/use-debug'
import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import { safeParseFloat } from '@/utils'
import { FormDebug } from '@/components/forms/form-debug'

type WorkOrderFormProps = {
  pageMetaData: PageMetadata
  workOrder: Awaited<ReturnType<typeof getWorkOrderByCode>>
}

export default function WorkOrderForm({ pageMetaData, workOrder }: WorkOrderFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !workOrder

  const values = useMemo(() => {
    if (workOrder) return { ...workOrder, lineItems: [] }

    if (isCreate) {
      return {
        code: -1,
        projectIndividualCode: 0,
        userCode: 0,
        status: '1',
        isInternal: true,
        billingAddrCode: null,
        deliveryAddrCode: null,
        comments: null,

        //* sap fields
        salesOrderCode: null,
        purchaseOrderCode: null,

        lineItems: [],
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(workOrder)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(workOrderFormSchema),
  })

  const projectCode = useWatch({ control: form.control, name: 'projectIndividualCode' })
  const userCode = useWatch({ control: form.control, name: 'userCode' })
  const status = useWatch({ control: form.control, name: 'status' })

  const { executeAsync, isExecuting } = useAction(upsertWorkOrder)
  const projects = usePis()
  const workOrderItems = useWoItemsByWoCode(workOrder?.code)

  const piCustomers = usePiCustomerByProjectCode(projectCode)
  const customer = useUserByCode(userCode) //TODO: use this customer data to get the customerCode and use it to fetch the address from SAP

  const selectedStatus = useMemo(() => WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === status)?.label, [status])
  const selectedProject = useMemo(() => projects.data.find((p) => p.code === projectCode), [JSON.stringify(projects), projectCode])

  const billingAddress = '' //TODO: should fetch address based on the addesses of the selected customer from SAP
  const deliveryAddress = '' //TODO: should fetch address based on the addesses of the selected customer from SAP

  const piCustomersOptions = useMemo(() => {
    if (piCustomers.isLoading || piCustomers.data.length < 1) return []

    return piCustomers.data.map((pi) => {
      const user = pi.user

      return {
        ...pi,
        fullName: `${user.fname}${user.lname ? ` ${user.lname}` : ''}`,
        email: user.email,
      }
    })
  }, [JSON.stringify(piCustomers)])

  const handleOnSubmit = async (formData: WorkOrderForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.workOrder && 'id' in result?.data?.workOrder) {
        router.refresh()
        workOrderItems.execute({ workOrderCode: result.data.workOrder.code })

        setTimeout(() => {
          router.push(`/work-orders/${result.data.workOrder.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  //* set line items if work order data exist
  useEffect(() => {
    if (workOrder && workOrderItems.data.length > 0) {
      const woItems = workOrderItems.data
        .filter((woItem) => woItem.projectItem !== null)
        .map((woItem) => {
          const pItem = woItem.projectItem

          const cost = safeParseFloat(woItem.cost)
          const qty = safeParseFloat(woItem.qty)

          return {
            projectItemCode: pItem.code,
            warehouseCode: woItem.warehouseCode,
            partNumber: woItem?.partNumber ?? '',
            dateCode: woItem?.dateCode ?? null,
            countryOfOrigin: woItem?.countryOfOrigin ?? null,
            lotCode: woItem?.lotCode ?? null,
            palletNo: woItem?.palletNo ?? null,
            dateReceived: woItem?.dateReceived ?? null,
            dateReceivedBy: woItem?.dateReceivedBy ?? null,
            packagingType: woItem?.packagingType ?? null,
            spq: woItem?.spq ?? null,
            cost,
            qty,

            //* set temporary fields
            projectName: pItem?.projectIndividual?.name ?? null,
            projectItemManufacturer: pItem?.item?.manufacturer ?? null,
            projectItemMpn: pItem?.item?.manufacturerPartNumber ?? null,
            projectItemDescription: pItem?.item?.description ?? null,
          }
        })

      form.setValue('lineItems', woItems)
    }
  }, [JSON.stringify(workOrder), JSON.stringify(workOrderItems)])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/work-orders')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {workOrder && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/work-orders/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{
                  text: 'View',
                  icon: 'eyeopen',
                  onClick: () => router.push(`/work-orders/${workOrder.code}/view`),
                }}
              />
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={projects.data}
                  isLoading={projects.isLoading}
                  control={form.control}
                  name='projectIndividualCode'
                  label='Project'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['code', 'name']}
                  isRequired
                  callback={() => form.resetField('userCode')}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.name,
                          description: params?.projectGroup?.name,
                          value: params?.code,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={piCustomersOptions}
                  isLoading={piCustomers.isLoading}
                  control={form.control}
                  name='userCode'
                  label='Owner'
                  valueExpr='userCode'
                  displayExpr='fullName'
                  searchExpr={['userCode', 'fullName', 'email']}
                  isRequired
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.fullName,
                          description: params?.email,
                          value: params?.userCode,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Status' value={selectedStatus || ''} />

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SwitchField
                  control={form.control}
                  name='isInternal'
                  label='Internal'
                  description='Is this an internal work order?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='comments' label='Order Comments' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='SAP Fields' description='SAP related fields' />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='salesOrderCode' label='Sales Order Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='salesOrderCode' label='Purchase Order Code' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Address Details' description='Billing & delivery address details' />

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='billingAddrCode'
                  label='Billing Address'
                  valueExpr=''
                  displayExpr=''
                  searchExpr={['']}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='deliveryAddrCode'
                  label='Delivery Address'
                  valueExpr=''
                  displayExpr=''
                  searchExpr={['']}
                />
              </div>

              {/* // TODO: add function to do multiple select received by */}
              <WorkOrderLineItemTable
                workOrder={workOrder}
                workOrderItems={workOrderItems}
                projectCode={selectedProject?.code}
                projectName={selectedProject?.name}
                isLoading={false}
              />
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
