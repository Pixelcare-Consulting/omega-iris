'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { WORK_ORDER_STATUS_OPTIONS, type WorkOrderForm, workOrderFormSchema } from '@/schema/work-order'
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
import { useAddresses } from '@/hooks/safe-actions/address'
import { useSalesOrderByWorkOrderCode } from '@/hooks/safe-actions/sales-order'

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
        shippingAddrCode: null,
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
  const billingAddrCode = useWatch({ control: form.control, name: 'billingAddrCode' })
  const shippingAddrCode = useWatch({ control: form.control, name: 'shippingAddrCode' })

  const { executeAsync, isExecuting } = useAction(upsertWorkOrder)
  const projects = usePis()
  const workOrderItems = useWoItemsByWoCode(workOrder?.code)

  const piCustomers = usePiCustomerByProjectCode(projectCode)
  const customer = useUserByCode(userCode)
  const salesOrder = useSalesOrderByWorkOrderCode(workOrder?.code)

  const selectedStatus = useMemo(() => WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === status)?.label, [status])
  const selectedProject = useMemo(() => projects.data.find((p) => p.code === projectCode), [JSON.stringify(projects), projectCode])

  const addresses = useAddresses(customer?.data?.customerCode ?? '')

  const getAddrOptions = (addresses: ReturnType<typeof useAddresses>['data']) => {
    if (!addresses || addresses.length < 1) return []

    return addresses.map((addr) => {
      const description = [
        addr.Street,
        addr.Address2,
        addr.Address3,
        addr.StreetNo,
        addr.BuildingFloorRoom,
        addr.Block,
        addr.City,
        addr.ZipCode,
        addr.County,
        addr.CountryName,
        addr.StateName,
        addr.GlobalLocationNumber,
      ]
        .filter(Boolean)
        .join(', ')

      return {
        label: addr.AddressName,
        value: addr.id,
        description,
      }
    })
  }

  const billingAddresses = useMemo(() => {
    if (addresses.isLoading || addresses.data.length < 1) return []
    return addresses.data.filter((a) => a.AddrType === 'B')
  }, [JSON.stringify(addresses)])

  const shippingAddresses = useMemo(() => {
    if (addresses.isLoading || addresses.data.length < 1) return []
    return addresses.data.filter((a) => a.AddrType === 'S')
  }, [JSON.stringify(addresses)])

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

  //* auto select first billing address when billing address dont have value
  useEffect(() => {
    if (!billingAddrCode && billingAddresses.length > 0) {
      const firstBillingAddress = billingAddresses[0]
      if (firstBillingAddress) form.setValue('billingAddrCode', firstBillingAddress.id)
    }
  }, [JSON.stringify(billingAddresses), billingAddrCode, isCreate])

  //* auto select first shipping address when shipping address dont have value
  useEffect(() => {
    if (!shippingAddrCode && shippingAddresses.length > 0) {
      const firstShippingAddress = shippingAddresses[0]
      if (firstShippingAddress) form.setValue('shippingAddrCode', firstShippingAddress.id)
    }
  }, [JSON.stringify(shippingAddresses), shippingAddrCode, isCreate])

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

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Sales Order Code'
                value={salesOrder.data?.DocNum || ''}
                isLoading={salesOrder.isLoading}
              />

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Address Details' description='Billing & delivery address details' />

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={getAddrOptions(billingAddresses)}
                  isLoading={addresses.isLoading}
                  control={form.control}
                  name='billingAddrCode'
                  label='Billing Address'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'description']}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.label,
                          description: params?.description,
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={getAddrOptions(shippingAddresses)}
                  control={form.control}
                  name='shippingAddrCode'
                  label='Delivery Address'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'description']}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.label,
                          description: params?.description,
                        })
                      },
                    },
                  }}
                />
              </div>

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
