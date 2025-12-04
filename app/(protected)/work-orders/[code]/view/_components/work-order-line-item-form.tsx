'use client'

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from 'react'
import { Item } from 'devextreme-react/toolbar'
import { Button } from 'devextreme-react/button'
import ScrollView from 'devextreme-react/scroll-view'

import { UpsertWorkOrderLineItemForm, upsertWorkOrderLineItemFormSchema, WorkOrderForm } from '@/schema/work-order'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { WorkOrderItemForm } from '@/schema/work-order'
import PageHeader from '@/app/(protected)/_components/page-header'
import LoadingButton from '@/components/loading-button'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import SelectBoxField from '@/components/forms/select-box-field'
import { commonItemRender, userItemRender } from '@/utils/devextreme'
import TextBoxField from '@/components/forms/text-box-field'
import DateBoxField from '@/components/forms/date-box-field'
import useUsers from '@/hooks/safe-actions/user'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import NumberBoxField from '@/components/forms/number-box-field'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { safeParseFloat } from '@/utils'
import { formatNumber } from 'devextreme/localization'
import ReadOnlyField from '@/components/read-only-field'
import { toast } from 'sonner'
import { Badge } from '@/components/badge'
import { upsertWorkOrderLineItem } from '@/actions/work-order'
import { useAction } from 'next-safe-action/hooks'
import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import { FormDebug } from '@/components/forms/form-debug'

type WorkOrderLineItemFormProps = {
  workOrderCode: number
  projectCode?: number
  projectName?: string
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  lineItem: WorkOrderItemForm | null
  users: ReturnType<typeof useUsers>
  warehouses: ReturnType<typeof useWarehouses>
  projectItems: ReturnType<typeof useProjecItems>
  workOrderItems: ReturnType<typeof useWoItemsByWoCode>
}

export default function WorkOrderLineItemForm({
  workOrderCode,
  projectCode,
  projectName,
  setIsOpen,
  onClose,
  lineItem,
  users,
  warehouses,
  projectItems,
  workOrderItems,
}: WorkOrderLineItemFormProps) {
  const isCreate = !lineItem

  const values = useMemo(() => {
    if (lineItem) return { ...lineItem, workOrderCode, operation: 'update' as const }

    if (isCreate) {
      return {
        workOrderCode,
        operation: 'create' as const,
        projectItemCode: 0,
        warehouseCode: 0,
        partNumber: '',
        dateCode: null,
        countryOfOrigin: null,
        lotCode: null,
        palletNo: null,
        dateReceived: null,
        dateReceivedBy: null,
        packagingType: null,
        spq: null,
        cost: 0,
        qty: 0,

        //* temporary fields
        projectName: null,
        projectItemManufacturer: null,
        projectItemMpn: null,
        projectItemDescription: null,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(lineItem), workOrderCode])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(upsertWorkOrderLineItemFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertWorkOrderLineItem)

  const projectItemCode = useWatch({ control: form.control, name: 'projectItemCode' })
  const warehouseCode = useWatch({ control: form.control, name: 'warehouseCode' })

  const woItems = useMemo(() => {
    if (workOrderItems.isLoading || workOrderItems.data.length < 1) return []

    return workOrderItems.data
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
  }, [JSON.stringify(workOrderItems)])

  const projectItemsOptions = useMemo(() => {
    if (projectItems.isLoading || projectItems.data.length < 1) return []

    return projectItems.data.map((pi) => {
      const baseItem = pi.item

      return {
        ...pi,
        manufacturerPartNumber: baseItem.manufacturerPartNumber,
        description: baseItem.description,
      }
    })
  }, [JSON.stringify(projectItems)])

  const selectedProjectItem = useMemo(() => {
    if (projectItems.isLoading || projectItems.data.length < 1) return null
    return projectItems.data.find((pi) => pi.code === projectItemCode)
  }, [JSON.stringify(projectItems), projectItemCode])

  const itemWarehouseInventory = useItemWarehouseInventory(selectedProjectItem?.item?.code)

  const selectedItemWarehouseInventory = useMemo(() => {
    if (itemWarehouseInventory.isLoading || itemWarehouseInventory.data.length < 1) return null
    return itemWarehouseInventory.data.find((wi) => wi.warehouseCode === warehouseCode)
  }, [JSON.stringify(itemWarehouseInventory), warehouseCode])

  const resetForm = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  const handleClose = () => {
    if (onClose) onClose()
    resetForm()
    setIsOpen(false)
  }

  const handleOnSubmit = useCallback(
    async (formData: UpsertWorkOrderLineItemForm) => {
      const item = selectedProjectItem?.item

      const finalFormData = {
        ...formData,
        workOrderCode: workOrderCode,
        projectName: projectName,
        projectItemManufacturer: item?.manufacturer, //TODO: should use the one from SAP
        projectItemMpn: item?.manufacturerPartNumber, //TODO: should use the one from SAP
        projectItemDescription: item?.description, //TODO: should use the one from SAP
      }

      try {
        const response = await executeAsync(finalFormData)
        const result = response?.data

        if (result?.error) {
          if (result.status === 401) {
            form.setError('projectItemCode', { type: 'custom', message: result.message })
          }

          toast.error(result.message)
          return
        }

        toast.success(result?.message)

        if (result?.data && result?.data?.workOrderItem) {
          workOrderItems.execute({ workOrderCode })

          if (onClose) {
            setTimeout(() => {
              resetForm()
              onClose()
            }, 1000)
          }
        }
      } catch (error) {
        console.error(error)
        toast.error('Something went wrong! Please try again later.')
      }
    },
    [isCreate, JSON.stringify(selectedProjectItem), JSON.stringify(workOrderItems), projectCode, projectName, onClose]
  )

  useEffect(() => {
    //* clear form to avoid unnncessary trigger of error on laod
    if (!lineItem) resetForm()
  }, [JSON.stringify(lineItem)])

  return (
    <FormProvider {...form}>
      <div className='flex h-full w-full flex-col gap-3'>
        <PageHeader
          title='Add Line Item'
          description={isCreate ? 'Fill in the form to create a new item for this project.' : 'Edit the form to update this item.'}
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={handleClose} />
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

            <div className='grid h-full grid-cols-12 gap-5 py-2 pr-4'>
              <div className='col-span-12'>
                <SelectBoxField
                  data={projectItemsOptions}
                  isLoading={projectItems.isLoading}
                  control={form.control}
                  name='projectItemCode'
                  label='Item'
                  valueExpr='code'
                  displayExpr='description'
                  searchExpr={['description', 'manufacturerPartNumber', 'code']}
                  description={projectName ? `Select from the items of the project "${projectName}"` : undefined}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.manufacturerPartNumber,
                          description: params?.description,
                          value: params?.code,
                          valuePrefix: '#',
                          otherItems: woItems.find((li) => li.projectItemCode === params?.code) ? (
                            <Badge variant='red'>Selected</Badge>
                          ) : null,
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='partNumber' label='Part Number' description='Custoner Part Number' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='dateCode' label='Date Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='countryOfOrigin' label='Country Of Origin' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='lotCode' label='Lot Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='palletNo' label='Pallet No' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='packagingType' label='Packaging Type' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='spq' label='SPQ' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Cost and Quantity' description='Item cost and quantity details' />

              <div className='col-span-12 md:col-span-6'>
                <NumberBoxField
                  control={form.control}
                  name='cost'
                  label='Cost'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <NumberBoxField
                  control={form.control}
                  name='qty'
                  label='Quantity'
                  isRequired
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_NUMBER_FORMAT } }}
                />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader
                className='col-span-12 mb-1'
                title='Item Received '
                description='Item date received and received by details'
              />

              <div className='col-span-12 md:col-span-6'>
                <DateBoxField control={form.control} type='datetime' name='dateReceived' label='Date Received' />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={users.data}
                  isLoading={users.isLoading}
                  control={form.control}
                  name='dateReceivedBy'
                  label='Received By'
                  valueExpr='code'
                  displayExpr={(item) => (item ? `${item?.fname}${item?.lname ? ` ${item?.lname}` : ''}` : '')}
                  searchExpr={['fname', 'lname', 'code', 'email']}
                  extendedProps={{ selectBoxOptions: { itemRender: userItemRender } }}
                />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Site Location ' description='Item site location details' />

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={warehouses.data}
                  isLoading={warehouses.isLoading}
                  control={form.control}
                  name='warehouseCode'
                  label='Warehouse'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['code', 'name']}
                  isRequired
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.name,
                          description: params?.description,
                          value: params?.code,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <ReadOnlyField
                className='col-span-12 md:col-span-6'
                title='Price'
                value={formatNumber(safeParseFloat(selectedProjectItem?.item?.Price), DEFAULT_CURRENCY_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6'
                title='In Stock'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6'
                title='Committed'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6'
                title='Ordered'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6'
                title='Available'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
              />
            </div>
          </ScrollView>
        </PageContentWrapper>
      </div>
    </FormProvider>
  )
}
