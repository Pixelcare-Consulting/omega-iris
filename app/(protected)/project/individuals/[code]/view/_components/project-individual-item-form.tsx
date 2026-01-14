'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { Dispatch, SetStateAction, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { subtract } from 'mathjs'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type ProjectItemForm, projectItemFormSchema } from '@/schema/project-item'
import LoadingButton from '@/components/loading-button'
import { upsertProjectItem } from '@/actions/project-item'
import SelectBoxField from '@/components/forms/select-box-field'
import { commonItemRender, userItemRender } from '@/utils/devextreme'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import { getProjecItems } from '@/actions/project-item'
import useItems from '@/hooks/safe-actions/item'
import ReadOnlyField from '@/components/read-only-field'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { safeParseFloat, safeParseInt } from '@/utils'
import ProjectIndividualItemWarehouseInventory from './project-individual-item-warehouse-inventory'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import TextBoxField from '@/components/forms/text-box-field'
import NumberBoxField from '@/components/forms/number-box-field'
import DateBoxField from '@/components/forms/date-box-field'
import useUsers from '@/hooks/safe-actions/user'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import TextAreaField from '@/components/forms/text-area-field'
import { FormDebug } from '@/components/forms/form-debug'

type ProjectItemFormProps = {
  projectCode: number
  projectName: string
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  item: Awaited<ReturnType<typeof getProjecItems>>[number] | null
  items: ReturnType<typeof useProjecItems>
  itemMasters: ReturnType<typeof useItems>
  users: ReturnType<typeof useUsers>
}

export default function ProjectItemForm({
  projectCode,
  projectName,
  setIsOpen,
  onClose,
  item,
  items,
  itemMasters,
  users,
}: ProjectItemFormProps) {
  const router = useRouter()

  const isCreate = !item

  const values = useMemo(() => {
    if (item) return item

    if (isCreate) {
      return {
        code: -1,
        itemCode: 0,
        projectIndividualCode: projectCode,
        warehouseCode: null,
        partNumber: null,
        dateCode: null,
        countryOfOrigin: null,
        lotCode: null,
        palletNo: null,
        packagingType: null,
        spq: null,
        cost: 0,
        stockIn: 0,
        stockOut: 0,
        totalStock: 0,
        dateReceived: null,
        dateReceivedBy: null,
        siteLocation: null,
        subLocation2: null,
        subLocation3: null,
        notes: null,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(item)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(projectItemFormSchema),
  })

  const warehouseCode = useWatch({ control: form.control, name: 'warehouseCode' })
  const itemCode = useWatch({ control: form.control, name: 'itemCode' })

  const totalStock = useWatch({ control: form.control, name: 'totalStock' })
  const stockIn = useWatch({ control: form.control, name: 'stockIn' })

  const { executeAsync, isExecuting } = useAction(upsertProjectItem)

  const availableToOrder = useMemo(() => {
    return subtract(safeParseFloat(totalStock), safeParseFloat(stockIn))
  }, [JSON.stringify(totalStock), JSON.stringify(stockIn)])

  const selectedBaseItem = useMemo(() => {
    if (itemMasters.isLoading || itemMasters.data.length < 1) return null
    return itemMasters.data.find((i) => i.code === itemCode)
  }, [itemCode, JSON.stringify(itemMasters)])

  const itemMasterWarehouseInventory = useItemWarehouseInventory(selectedBaseItem?.code)

  //* Temporary disable
  // const selectedItemMasterWarehouseInventory = useMemo(() => {
  //   if (itemMasterWarehouseInventory.isLoading || itemMasterWarehouseInventory.data.length < 1) return null
  //   return itemMasterWarehouseInventory.data.find((wi) => wi.warehouseCode === warehouseCode)
  // }, [JSON.stringify(itemMasterWarehouseInventory), warehouseCode])

  //* Temporary disable
  // const warehouse = useMemo(() => {
  //   if (warehouses.isLoading || warehouses.data.length < 1) return null
  //   return warehouses.data.find((w) => w.code === warehouseCode)
  // }, [JSON.stringify(warehouses), warehouseCode])

  const resetForm = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  const handleOnSubmit = async (formData: ProjectItemForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('itemCode', { type: 'custom', message: result.message })
          console.log('error part number')
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.projectItem && 'id' in result?.data?.projectItem) {
        router.refresh()

        items.execute({ projectCode })

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
  }

  const handleClose = () => {
    if (onClose) onClose()
    setTimeout(() => resetForm(), 100)
    setIsOpen(false)
  }

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-3' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader
          title={`Add Item to ${projectName}`}
          description={isCreate ? 'Fill in the form to create a new item for this project.' : 'Edit the form to update this item.'}
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={handleClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 py-2 pr-4'>
              <ReadOnlyField
                className='col-span-12 lg:col-span-3'
                value={
                  <img
                    src={selectedBaseItem?.thumbnail || '/images/placeholder-img.jpg'}
                    className='size-[280px] w-full rounded-2xl object-cover object-center'
                  />
                }
              />

              <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
                <div className='col-span-12'>
                  <SelectBoxField
                    data={itemMasters.data}
                    isLoading={itemMasters.isLoading}
                    control={form.control}
                    name='itemCode'
                    label='Item'
                    valueExpr='code'
                    displayExpr='description'
                    searchExpr={['description', 'manufacturerPartNumber']}
                    extendedProps={{
                      selectBoxOptions: {
                        itemRender: (params) => {
                          return commonItemRender({
                            title: params?.manufacturerPartNumber,
                            description: params?.description,
                            value: params?.code,
                            valuePrefix: '#',
                          })
                        },
                      },
                    }}
                  />
                </div>

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer' value={selectedBaseItem?.manufacturer || ''} />

                <ReadOnlyField
                  className='col-span-12 md:col-span-6'
                  title='MFG P/N'
                  value={selectedBaseItem?.manufacturerPartNumber || ''}
                />

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={selectedBaseItem?.description || ''} />

                <ReadOnlyField
                  className='col-span-12 md:col-span-6'
                  title='Active'
                  value={selectedBaseItem?.isActive ? 'Active' : 'Inactive'}
                />

                <ReadOnlyField className='col-span-12' title='Notes' value={selectedBaseItem?.notes || ''} />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='SAP Fields' description='SAP related fields' />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Code' value={selectedBaseItem?.ItemCode || ''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Manufacturer Code'
                value={selectedBaseItem?.FirmCode || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Manufacturer Name'
                value={selectedBaseItem?.FirmName || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Description'
                value={selectedBaseItem?.ItemName || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Group Code'
                value={selectedBaseItem?.ItmsGrpCod || ''}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Group Name'
                value={selectedBaseItem?.ItmsGrpNam || ''}
              />

              {/* <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Price'
                value={formatNumber(safeParseFloat(selectedBaseItem?.Price), DEFAULT_CURRENCY_FORMAT)}
              /> */}

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Project Item' description='Project item details' />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='partNumber' label='Part Number' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='dateCode' label='Date Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='countryOfOrigin' label='Country Of Origin' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='lotCode' label='Lot Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='palletNo' label='Pallet No' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='packagingType' label='Packaging Type' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='spq' label='SPQ' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='cost'
                  label='Cost'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Available To Order'
                value={formatNumber(availableToOrder, DEFAULT_NUMBER_FORMAT)}
              />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='stockIn'
                  label='Stock-In (In Process)'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_NUMBER_FORMAT, disabled: true } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='stockOut'
                  label='Stock-Out (Delivered)'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_NUMBER_FORMAT, disabled: true } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='totalStock'
                  label='Total Stock'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_NUMBER_FORMAT } }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='notes' label='Notes' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='siteLocation' label='Site Location' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation2' label='Sub Location 2' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation3' label='Sub Location 3' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader
                className='col-span-12 mb-1'
                title='Item Received '
                description='Item date received and received by details'
              />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <DateBoxField control={form.control} type='datetime' name='dateReceived' label='Date Received' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
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

              {/* //* Temporary disable */}
              {/* <Separator className='col-span-12' />
              <ReadOnlyFieldHeader
                className='col-span-12 mb-1'
                title='Site Location '
                description='Item warehouse and warehouse inventory details'
              />

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

              <ReadOnlyField className='col-span-12 md:col-span-6' title='Description' value={warehouse?.description || ''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='In Stock'
                value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Committed'
                value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Ordered'
                value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
              />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Available'
                value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
              /> */}
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
