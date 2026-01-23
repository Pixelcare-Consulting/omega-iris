import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from 'react'
import { Item } from 'devextreme-react/toolbar'
import { Button } from 'devextreme-react/button'
import ScrollView from 'devextreme-react/scroll-view'
import { format, isValid } from 'date-fns'

import { WorkOrderForm, workOrderItemFormSchema } from '@/schema/work-order'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { WorkOrderItemForm } from '@/schema/work-order'
import PageHeader from '../../_components/page-header'
import LoadingButton from '@/components/loading-button'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import PageContentWrapper from '../../_components/page-content-wrapper'
import SelectBoxField from '@/components/forms/select-box-field'
import { commonItemRender } from '@/utils/devextreme'
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
import { FormDebug } from '@/components/forms/form-debug'
import { useSession } from 'next-auth/react'

type WorkOrderLineItemFormProps = {
  projectName?: string
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  lineItem: (Record<string, any> & WorkOrderItemForm) | null
  users: ReturnType<typeof useUsers>
  warehouses: ReturnType<typeof useWarehouses>
  projectItems: ReturnType<typeof useProjecItems>
}

export default function WorkOrderLineItemForm({ projectName, setIsOpen, onClose, lineItem, projectItems }: WorkOrderLineItemFormProps) {
  const { data: session } = useSession()
  const mainForm = useFormContext<WorkOrderForm>()

  const lineItems = useWatch({ control: mainForm.control, name: 'lineItems' }) || []

  const isCreate = !lineItem

  const values = useMemo(() => {
    if (lineItem) return lineItem

    if (isCreate) return { projectItemCode: 0, qty: 0, maxQty: 0, isDelivered: false }

    return undefined
  }, [isCreate, JSON.stringify(lineItem)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(workOrderItemFormSchema),
  })

  const projectItemCode = useWatch({ control: form.control, name: 'projectItemCode' })
  const maxQty = useWatch({ control: form.control, name: 'maxQty' })

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const projectItemsOptions = useMemo(() => {
    if (projectItems.isLoading || projectItems.data.length < 1) return []

    return projectItems.data.map((pi) => {
      const baseItem = pi.item

      return {
        ...pi,
        ItemCode: baseItem?.ItemCode,
        ItemName: baseItem?.ItemName,
      }
    })
  }, [JSON.stringify(projectItems)])

  const selectedProjectItem = useMemo(() => {
    if (projectItems.isLoading || projectItems.data.length < 1) return null
    return projectItems.data.find((pi) => pi.code === projectItemCode)
  }, [JSON.stringify(projectItems), projectItemCode])

  //* Temporary disable
  // const itemWarehouseInventory = useItemWarehouseInventory(selectedProjectItem?.item?.code)

  //* Temporary disable
  // const selectedItemWarehouseInventory = useMemo(() => {
  //   if (itemWarehouseInventory.isLoading || itemWarehouseInventory.data.length < 1) return null
  //   return itemWarehouseInventory.data.find((wi) => wi.warehouseCode === selectedProjectItem?.warehouse?.code)
  // }, [JSON.stringify(itemWarehouseInventory), JSON.stringify(selectedProjectItem?.warehouse?.code)])

  const dateReceived = useMemo(() => {
    if (!selectedProjectItem?.dateReceived || !isValid(selectedProjectItem?.dateReceived)) return ''
    return format(selectedProjectItem?.dateReceived, 'MM/dd/yyyy hh:mm a')
  }, [JSON.stringify(selectedProjectItem?.dateReceived)])

  const dateReceivedBy = useMemo(() => {
    if (!selectedProjectItem?.dateReceivedByUser) return ''
    return `${selectedProjectItem?.dateReceivedByUser.fname}${selectedProjectItem?.dateReceivedByUser.lname ? ` ${selectedProjectItem?.dateReceivedByUser.lname}` : ''}`
  }, [JSON.stringify(selectedProjectItem?.dateReceivedByUser)])

  //* Temporary disable
  // const warehouse = useMemo(() => {
  //   return selectedProjectItem?.warehouse
  // }, [JSON.stringify(selectedProjectItem)])

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
    async (formData: WorkOrderItemForm) => {
      if (isCreate) {
        //* throw error if item is already selected
        const isSelected = lineItems.find((li) => li.projectItemCode === formData.projectItemCode)

        if (isSelected) {
          form.setError('projectItemCode', { type: 'custom', message: 'Item already selected!' })
          toast.error('Item already selected!')
          return
        }

        //* if create push the new line item
        const currentLineItems = [...lineItems]
        currentLineItems.push(formData)
        mainForm.setValue('lineItems', currentLineItems)
        mainForm.clearErrors('lineItems')
      } else {
        //* throw error if item is already selected, it should not equial to the current line item project item code and should not exist in the line items
        const isSelected = lineItems.find(
          (li) => lineItem.projectItemCode !== formData.projectItemCode && li.projectItemCode === formData.projectItemCode
        )

        if (isSelected) {
          form.setError('projectItemCode', { type: 'custom', message: 'Item already selected!' })
          toast.error('Item already selected!')
          return
        }

        //* if edit update the existing line item
        const currentLineItems = [...lineItems]
        const index = currentLineItems.findIndex((li) => li.projectItemCode === formData.projectItemCode)

        if (index !== -1) {
          currentLineItems[index] = formData
          mainForm.setValue('lineItems', currentLineItems)
        } else toast.error('Failed to update the line item!')
      }

      if (onClose) {
        resetForm()
        onClose()
      }
    },
    [isCreate, JSON.stringify(selectedProjectItem), JSON.stringify(lineItems), JSON.stringify(lineItem), onClose]
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
              isLoading={false}
              onClick={() => form.handleSubmit(handleOnSubmit)()}
            />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 py-2 pr-4'>
              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={projectItemsOptions}
                  isLoading={projectItems.isLoading}
                  control={form.control}
                  name='projectItemCode'
                  label='Item'
                  valueExpr='code'
                  displayExpr='ItemName'
                  searchExpr={['ItemName', 'ItemCode', 'code']}
                  description={projectName ? `Select from the items of the project "${projectName}"` : undefined}
                  callback={(args) => {
                    form.setValue('maxQty', args?.item?.availableToOrder)
                    if (!args?.item?.totalStock || args?.item?.totalStock <= 0) {
                      setTimeout(() => form.setError('projectItemCode', { type: 'custom', message: 'Selected item is out of stock' }))
                    }
                  }}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.ItemCode,
                          description: params?.ItemName,
                          value: params?.code,
                          valuePrefix: '#',
                          otherItems: (
                            <div className='flex flex-wrap items-center gap-1'>
                              {params?.totalStock && params?.totalStock > 0 ? (
                                <Badge variant='green'>In Stock</Badge>
                              ) : (
                                <Badge variant='black'>Out of Stock</Badge>
                              )}
                              {lineItems.find((li) => li.projectItemCode === params?.code) ? <Badge variant='red'>Selected</Badge> : null}
                            </div>
                          ),
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <NumberBoxField
                  control={form.control}
                  name='qty'
                  label='Quantity'
                  isRequired
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_NUMBER_FORMAT } }}
                  description={`Must be greater than 1 and less than or equal to ${maxQty}`}
                />
              </div>

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Part Number'
                value={selectedProjectItem?.partNumber || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Date Code'
                value={selectedProjectItem?.dateCode || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Country Of Origin'
                value={selectedProjectItem?.countryOfOrigin || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Lot Code'
                value={selectedProjectItem?.lotCode || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Pallet No'
                value={selectedProjectItem?.palletNo || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Packaging Type'
                value={selectedProjectItem?.packagingType || ''}
              />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='SPQ' value={selectedProjectItem?.spq || ''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Cost'
                value={formatNumber(safeParseFloat(selectedProjectItem?.cost), DEFAULT_CURRENCY_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Available To Order'
                value={formatNumber(safeParseFloat(selectedProjectItem?.availableToOrder), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Stock-In (In Process)'
                value={formatNumber(safeParseFloat(selectedProjectItem?.stockIn), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Stock-Out (Delivered)'
                value={formatNumber(safeParseFloat(selectedProjectItem?.stockOut), DEFAULT_NUMBER_FORMAT)}
              />

              {!isBusinessPartner && (
                <ReadOnlyField
                  className='col-span-12 md:col-span-6 lg:col-span-4'
                  title='Total Stock'
                  value={formatNumber(safeParseFloat(selectedProjectItem?.totalStock), DEFAULT_NUMBER_FORMAT)}
                />
              )}

              <ReadOnlyField className='col-span-12' title='Notes' value={selectedProjectItem?.notes || ''} />

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Site Location'
                value={selectedProjectItem?.siteLocation || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Sub Location 2'
                value={selectedProjectItem?.subLocation2 || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Sub Location 3'
                value={selectedProjectItem?.subLocation3 || ''}
              />

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader
                className='col-span-12 mb-1'
                title='Item Received '
                description='Item date received and received by details'
              />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received By' value={dateReceivedBy} />

              {/* //* Temporary disable */}
              {/* <Separator className='col-span-12' />
              <ReadOnlyFieldHeader
                className='col-span-12 mb-1'
                title='Site Location '
                description='Item warehouse and warehouse inventory details'
              />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Warehouse' value={warehouse?.name || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Description' value={warehouse?.description || ''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='In Stock'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Committed'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Ordered'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Available'
                value={formatNumber(safeParseFloat(selectedItemWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
              /> */}
            </div>
          </ScrollView>
        </PageContentWrapper>
      </div>
    </FormProvider>
  )
}
