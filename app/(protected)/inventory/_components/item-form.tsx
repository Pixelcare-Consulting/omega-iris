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
import { type ItemForm, itemFormSchema } from '@/schema/item'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { getItemByCode, upsertItem } from '@/actions/item'
import { PageMetadata } from '@/types/common'
import SelectBoxField from '@/components/forms/select-box-field'
import TextAreaField from '@/components/forms/text-area-field'
import SwitchField from '@/components/forms/switch-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import ImageUploaderField from '@/components/forms/image-uploader-field'
import NumberBoxField from '@/components/forms/number-box-field'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import ItemWarehouseInventoryForm from './item-warehouse-inventory-form'
import { useItemGroups } from '@/hooks/safe-actions/item-group'
import { useManufacturers } from '@/hooks/safe-actions/manufacturer'
import { commonItemRender } from '@/utils/devextreme'
import ReadOnlyField from '@/components/read-only-field'
import { titleCase } from '@/utils'
import CanView from '@/components/acl/can-view'

type ItemFormProps = { pageMetaData: PageMetadata; item: Awaited<ReturnType<typeof getItemByCode>> }

export default function ItemForm({ pageMetaData, item }: ItemFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !item

  const values = useMemo(() => {
    if (item) return { ...item, warehouseInventory: [] }

    if (isCreate) {
      return {
        code: -1,
        thumbnail: null,
        notes: null,
        isActive: true,
        syncStatus: 'pending',

        // warehouseInventory: [],

        //* sap fields
        ItemCode: '',
        ItemName: null,
        ItmsGrpCod: null,
        ItmsGrpNam: null,
        FirmCode: null,
        FirmName: null,
        Price: null,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(item)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(itemFormSchema),
  })

  const ItmsGrpCod = useWatch({ control: form.control, name: 'ItmsGrpCod' })
  const FirmCode = useWatch({ control: form.control, name: 'FirmCode' })
  const syncStatus = useWatch({ control: form.control, name: 'syncStatus' })

  const { executeAsync, isExecuting } = useAction(upsertItem)

  const itemGroups = useItemGroups()
  const manufacturers = useManufacturers()

  // const warehouses = useWarehouses()
  // const itemWarehouseInventory = useItemWarehouseInventory(item?.code)

  const handleOnSubmit = async (formData: ItemForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('ItemCode', { type: 'custom', message: result.message })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.item && 'id' in result?.data?.item) {
        router.refresh()

        // itemWarehouseInventory.execute({ itemCode: result.data.item.code })

        setTimeout(() => {
          if (isCreate) router.push(`/inventory`)
          else router.push(`/inventory/${result.data.item.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  //* initialize warehouses inventory when create based on warehouses
  // useEffect(() => {
  //   if (!isCreate || warehouses.isLoading || warehouses.data.length < 1) return

  //   const values = warehouses.data.map((wh) => ({
  //     code: wh.code,
  //     name: wh.name,
  //     isLocked: false,
  //     inStock: 0,
  //     committed: 0,
  //     ordered: 0,
  //     available: 0,
  //   }))

  //   form.setValue('warehouseInventory', values)
  // }, [isCreate, JSON.stringify(warehouses)])

  // //* set warehoise inventoryt when edit based on existing warehose inventory data
  // useEffect(() => {
  //   if (isCreate || itemWarehouseInventory.isLoading || itemWarehouseInventory.data.length < 1) {
  //     if (warehouses?.data.length > 0) {
  //       const values = warehouses?.data.map((wh) => ({
  //         code: wh.code,
  //         name: wh.name,
  //         isLocked: false,
  //         inStock: 0,
  //         committed: 0,
  //         ordered: 0,
  //         available: 0,
  //       }))

  //       form.setValue('warehouseInventory', values)
  //       return
  //     }
  //   }

  //   const values = itemWarehouseInventory.data.map((wi) => ({
  //     code: wi.warehouseCode,
  //     name: wi.warehouse.name,
  //     isLocked: wi.isLocked,
  //     inStock: wi.inStock,
  //     committed: wi.committed,
  //     ordered: wi.ordered,
  //     available: wi.available,
  //   }))

  //   form.setValue('warehouseInventory', values)
  // }, [JSON.stringify(item), JSON.stringify(itemWarehouseInventory), JSON.stringify(warehouses)])

  //* set item group name when itmsGrpCod is changed
  useEffect(() => {
    if (ItmsGrpCod && !itemGroups.isLoading && itemGroups.data?.length > 0) {
      const selectedItemGroup = itemGroups.data.find((ig: any) => ig.Number === ItmsGrpCod)
      if (selectedItemGroup) form.setValue('ItmsGrpNam', selectedItemGroup.GroupName)
    }
  }, [ItmsGrpCod, JSON.stringify(itemGroups)])

  //* set manufacturer name when firmCode is changed
  useEffect(() => {
    if (FirmCode && !manufacturers.isLoading && manufacturers.data?.length > 0) {
      const selectedManufacturer = manufacturers.data.find((m: any) => m.Code === FirmCode)
      if (selectedManufacturer) form.setValue('FirmName', selectedManufacturer.ManufacturerName)
    }
  }, [FirmCode, JSON.stringify(manufacturers)])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/inventory')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={CanView({ isReturnBoolean: true, subject: 'p-inventory', action: !item ? ['create'] : ['edit'] }) ? false : true}
            />
          </Item>

          {item && (
            <>
              <CanView subject='p-inventory' action='create'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/inventory/add`) }}
                />
              </CanView>

              <CanView subject='p-inventory' action='view'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{
                    text: 'View',
                    icon: 'eyeopen',
                    onClick: () => router.push(`/inventory/${item.code}/view`),
                  }}
                />
              </CanView>
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 flex items-center justify-center lg:col-span-3'>
                <ImageUploaderField
                  control={form.control}
                  name='thumbnail'
                  extendedProps={{
                    uploaderContainerClassName: 'w-full h-[280px]',
                    formDescription: { className: 'text-center block' },
                  }}
                  description='Recommended size: 800x800'
                />
              </div>

              <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
                <div className='col-span-12 md:col-span-6 lg:col-span-6'>
                  <TextBoxField control={form.control} name='ItemCode' label='Code' />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <SelectBoxField
                    data={manufacturers.data}
                    isLoading={manufacturers.isLoading}
                    control={form.control}
                    name='FirmCode'
                    label='Manufacturer'
                    valueExpr='Code'
                    displayExpr='ManufacturerName'
                    searchExpr={['ManufacturerName', 'Code']}
                    extendedProps={{
                      selectBoxOptions: {
                        itemRender: (params) => {
                          return commonItemRender({
                            title: params?.ManufacturerName,
                            value: params?.Code,
                            valuePrefix: '#',
                          })
                        },
                      },
                    }}
                  />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <TextBoxField control={form.control} name='ItemName' label='Description' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-6'>
                  <SelectBoxField
                    data={itemGroups.data}
                    isLoading={itemGroups.isLoading}
                    control={form.control}
                    name='ItmsGrpCod'
                    label='Group'
                    valueExpr='Number'
                    displayExpr='GroupName'
                    searchExpr={['GroupName', 'Number']}
                    extendedProps={{
                      selectBoxOptions: {
                        itemRender: (params) => {
                          return commonItemRender({
                            title: params?.GroupName,
                            value: params?.Number,
                            valuePrefix: '#',
                          })
                        },
                      },
                    }}
                  />
                </div>

                <div className='col-span-12'>
                  <TextAreaField control={form.control} name='notes' label='Note' />
                </div>

                <ReadOnlyField
                  className='col-span-12 md:col-span-6 lg:col-span-4'
                  title='Sync Status'
                  value={syncStatus ? titleCase(syncStatus) : ''}
                />

                <div className='col-span-12 md:col-span-4'>
                  <SwitchField
                    control={form.control}
                    name='isActive'
                    label='Active'
                    description='Is this item active?'
                    extendedProps={{ switchOptions: { disabled: isCreate } }}
                  />
                </div>
              </div>

              {/* <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <NumberBoxField
                  control={form.control}
                  name='Price'
                  label='Price'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div> */}

              {/* <ItemWarehouseInventoryForm isLoading={itemWarehouseInventory.isLoading} /> */}
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
