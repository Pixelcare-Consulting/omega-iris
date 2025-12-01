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
import { type InventoryForm, inventoryFormSchema, PALLET_SIZE_VALUES } from '@/schema/inventory'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { getInventoryByCode, upsertInventory } from '@/actions/inventory'
import { PageMetadata } from '@/types/common'
import SelectBoxField from '@/components/forms/select-box-field'
import { useUsersByRoleKeyClient } from '@/hooks/safe-actions/user'
import TextAreaField from '@/components/forms/text-area-field'
import { commonItemRender, userItemRender } from '@/utils/devextreme'
import SwitchField from '@/components/forms/switch-field'
import { useProjectIndividualsByBpUserCodeClient } from '@/hooks/safe-actions/project-individual'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import DateBoxField from '@/components/forms/date-box-field'
import Separator from '@/components/separator'
import ImageUploaderField from '@/components/forms/image-uploader-field'
import { useWarehouseClient } from '@/hooks/safe-actions/warehouse'
import InventoryWarehouseForm from './inventory-warehouse-form'
import { FormDebug } from '@/components/forms/form-debug'
import { useWarehouseInventoriesByItemCodeClient } from '@/hooks/safe-actions/warehouse-inventory'

type InventoryFormProps = { pageMetaData: PageMetadata; inventory: Awaited<ReturnType<typeof getInventoryByCode>> }

export default function InventoryForm({ pageMetaData, inventory }: InventoryFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !inventory

  const values = useMemo(() => {
    if (inventory) return { ...inventory, warehouseInventory: [] }

    if (isCreate) {
      return {
        code: -1,
        userCode: null,
        projectIndividualCode: null,
        thumbnail: '',
        partNumber: null,
        manufacturer: null,
        manufacturerPartNumber: '',
        description: null,
        dateCode: null,
        lotCode: null,
        siteLocation: null,
        subLocation1: null,
        subLocation2: null,
        subLocation3: null,
        subLocation4: null,
        packagingType: null,
        spq: null,
        countryOfOrigin: null,
        notes: null,
        palletSize: null,
        palletNo: null,
        isActive: true,
        dateReceived: null,
        warehouseInventory: [],
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(inventory)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(inventoryFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertInventory)

  const userCode = useWatch({ control: form.control, name: 'userCode' })
  const customerUsers = useUsersByRoleKeyClient('business-partner')
  const projects = useProjectIndividualsByBpUserCodeClient(userCode)
  const warehouses = useWarehouseClient(true)
  const warehouseInventories = useWarehouseInventoriesByItemCodeClient(inventory?.code)

  //* initialize warehouses inventory when create based on default warehouses
  useEffect(() => {
    if (!isCreate || warehouses.isLoading || warehouses.data.length < 1) return

    const values = warehouses.data.map((wh) => ({
      code: wh.code,
      name: wh.name,
      isLocked: false,
      inStock: 0,
      committed: 0,
      ordered: 0,
      available: 0,
    }))

    form.setValue('warehouseInventory', values)
  }, [isCreate, JSON.stringify(warehouses)])

  //* set warehoise inventoryt when edit based on existing warehose inventory data
  useEffect(() => {
    if (isCreate || warehouseInventories.isLoading || warehouseInventories.data.length < 1) {
      if (warehouses?.data.length > 0) {
        const values = warehouses?.data.map((wh) => ({
          code: wh.code,
          name: wh.name,
          isLocked: false,
          inStock: 0,
          committed: 0,
          ordered: 0,
          available: 0,
        }))

        form.setValue('warehouseInventory', values)
        return
      }
    }

    const values = warehouseInventories.data.map((wi) => ({
      code: wi.warehouseCode,
      name: wi.warehouse.name,
      isLocked: wi.isLocked,
      inStock: wi.inStock,
      committed: wi.committed,
      ordered: wi.ordered,
      available: wi.available,
    }))

    form.setValue('warehouseInventory', values)
  }, [JSON.stringify(warehouseInventories), JSON.stringify(warehouses)])

  const handleOnSubmit = async (formData: InventoryForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('manufacturerPartNumber', { type: 'custom', message: result.message })
          console.log('error part number')
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.inventory && 'id' in result?.data?.inventory) {
        router.refresh()
        warehouseInventories.execute({ itemCode: result.data.inventory.code })

        setTimeout(() => {
          router.push(`/inventories/${result.data.inventory.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/inventories')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {inventory && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/inventories/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{
                  text: 'View',
                  icon: 'eyeopen',
                  onClick: () => router.push(`/inventories/${inventory.code}/view`),
                }}
              />
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
                <div className='col-span-12 md:col-span-6'>
                  <SelectBoxField
                    data={customerUsers.data}
                    isLoading={customerUsers.isLoading}
                    control={form.control}
                    name='userCode'
                    label='Customer'
                    valueExpr='code'
                    displayExpr={(item) => (item ? `${item?.fname} (${item?.lname})` : '')}
                    searchExpr={['fname', 'lname', 'code']}
                    extendedProps={{ selectBoxOptions: { itemRender: userItemRender } }}
                  />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <SelectBoxField
                    data={projects.data}
                    isLoading={projects.isLoading}
                    control={form.control}
                    name='projectIndividualCode'
                    label='Project'
                    valueExpr='code'
                    displayExpr='name'
                    searchExpr={['name', 'code']}
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

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='manufacturer' label='Manufacturer' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='manufacturerPartNumber' label='MFG P/N' isRequired />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='partNumber' label='Part Number' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='description' label='Description' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <DateBoxField control={form.control} name='dateReceived' type='date' label='Date Received' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='dateCode' label='Date Code' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='lotCode' label='Lot Code' />
                </div>

                <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                  <TextBoxField control={form.control} name='countryOfOrigin' label='Country of Origin' />
                </div>
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='packagingType' label='Packaging Type' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='spq' label='SPQ' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={PALLET_SIZE_VALUES}
                  control={form.control}
                  name='palletSize'
                  label='Pallet Size'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='palletNo' label='Pallet No' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  name='isActive'
                  label='Active'
                  description='Is this project individual active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='notes' label='Note' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Address' description='Inventory address details' />

              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='siteLocation' label='Site Location' />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='subLocation1' label='Sub Location' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation2' label='Sub Location 2' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation3' label='Sub Location 3' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation4' label='Sub Location 4' />
              </div>

              <InventoryWarehouseForm isLoading={warehouseInventories.isLoading} />
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
