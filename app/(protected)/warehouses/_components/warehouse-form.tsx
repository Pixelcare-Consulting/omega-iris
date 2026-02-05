'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type WarehouseForm, warehouseFormSchema } from '@/schema/warehouse'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getWarehouseByCode, upsertWarehouse } from '@/actions/warehouse'
import { PageMetadata } from '@/types/common'
import SwitchField from '@/components/forms/switch-field'
import TextAreaField from '@/components/forms/text-area-field'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import SelectBoxField from '@/components/forms/select-box-field'

type WarehouseFormProps = { pageMetaData: PageMetadata; warehouse: Awaited<ReturnType<typeof getWarehouseByCode>> }

export default function WarehouseForm({ pageMetaData, warehouse }: WarehouseFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !warehouse

  const values = useMemo(() => {
    if (warehouse) return warehouse

    if (isCreate) {
      return {
        code: -1,
        name: '',
        description: null,
        isActive: true,
        isDefault: false,
        isNettable: false,
        isEnableBinLocations: false,
        address1: null,
        address2: null,
        address3: null,
        streetPoBox: null,
        streetNo: null,
        block: null,
        buildingFloorRoom: null,
        zipCode: null,
        city: null,
        county: null,
        countryRegion: null,
        state: null,
        federalTaxId: null,
        gln: null,
        taxOffice: null,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(warehouse)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(warehouseFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertWarehouse)

  const handleOnSubmit = async (formData: WarehouseForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.warehouse && 'id' in result?.data?.warehouse) {
        router.refresh()

        setTimeout(() => {
          router.push(`/warehouses/${result.data.warehouse.code}`)
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
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/warehouses')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {warehouse && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/warehouses/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/warehouses/${warehouse.code}/view`) }}
              />
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='name' label='Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TextAreaField control={form.control} name='description' label='Description' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='isActive'
                  label='Active'
                  description='Is this warehouse active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='isDefault'
                  label='Default'
                  description='Is this a default warehouse?'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='isNettable'
                  label='Nettable'
                  description='Is this warehouse nettable?'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='isEnableBinLocations'
                  label='Enable Bin Locations'
                  description='Enable bin locations for this warehouse?'
                />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Warehouse Location' description='Warehouse location details' />

              <div className='col-span-12 lg:col-span-4'>
                <TextAreaField control={form.control} name='address1' label='Street 1' />
              </div>

              <div className='col-span-12 lg:col-span-4'>
                <TextAreaField control={form.control} name='address2' label='Street 2' />
              </div>

              <div className='col-span-12 lg:col-span-4'>
                <TextAreaField control={form.control} name='address3' label='Street 3' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='streetPoBox' label='Street/PO Box' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='streetNo' label='Street No.' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='block' label='Block' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='buildingFloorRoom' label='Building/Floor/Room' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='zipCode' label='Zip Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='city' label='City' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='countryRegion'
                  label='Country/Region'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='state'
                  label='State'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='county' label='County' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='federalTaxId' label='Federal Tax ID' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='gln' label='GLN' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='taxOffice' label='Tax Office' />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
