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
import { useCountries } from '@/hooks/safe-actions/country'
import { useStates } from '@/hooks/safe-actions/state'

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
        isActive: true,
        WarehouseCode: '',
        WarehouseName: '',
        Nettable: false,
        EnableBinLocations: false,
        DefaultBin: null,
        Street: null,
        Address2: null,
        Address3: null,
        StreetNo: null,
        BuildingFloorRoom: null,
        Block: null,
        City: null,
        ZipCode: null,
        County: null,
        CountryCode: null,
        CountryName: null,
        StateCode: null,
        StateName: null,
        GlobalLocationNumber: null,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(warehouse)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(warehouseFormSchema),
  })

  const countryCode = useWatch({ control: form.control, name: 'CountryCode' })
  const stateCode = useWatch({ control: form.control, name: 'StateCode' })

  const countries = useCountries()
  const states = useStates(countryCode ?? '')

  const { executeAsync, isExecuting } = useAction(upsertWarehouse)

  const handleOnSubmit = async (formData: WarehouseForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401 && result.paths && result.paths.length > 0) {
          result.paths.forEach((path) => {
            const field = path.field as keyof WarehouseForm
            form.setError(field, { type: 'custom', message: path.message })
          })
        }

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

  //* set CountryName when CountryCode was changed
  useEffect(() => {
    if (countryCode && !countries.isLoading && countries.data.length > 0) {
      const selectedCountry = countries.data.find((c: any) => c.Code === countryCode)
      if (selectedCountry) form.setValue('CountryName', selectedCountry.Name)
    }
  }, [countryCode, JSON.stringify(countries)])

  //* set StateName when StateCode was changed
  useEffect(() => {
    if (stateCode && !states.isLoading && states.data.length > 0) {
      const selectedState = states.data.find((s: any) => s.Code === stateCode)
      if (selectedState) form.setValue('StateName', selectedState.Name)
    }
  }, [stateCode, JSON.stringify(states)])

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
          <ScrollView useNative>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='WarehouseCode' label='Code' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='WarehouseName' label='Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='isActive'
                  label='Active'
                  description='Is this warehouse active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='Nettable'
                  label='Nettable'
                  description='Is this warehouse nettable?'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SwitchField
                  control={form.control}
                  layout='wide'
                  name='EnableBinLocations'
                  label='Enable Bin Locations'
                  description='Enable bin locations for this warehouse?'
                />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Warehouse Location' description='Warehouse location details' />

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='Street' label='Line 1' />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='Address2' label='Line 2' />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='Address3' label='Line 3' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='StreetNo' label='Street No.' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='BuildingFloorRoom' label='BuildingFloorRoom' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='Block' label='Block' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='City' label='City' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='ZipCode' label='Zip Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='County' label='County' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={countries.data}
                  isLoading={countries.isLoading}
                  control={form.control}
                  name='CountryCode'
                  label='Country'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                  callback={() => {
                    form.setValue('StateCode', null)
                    form.setValue('StateName', null)
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={states.data}
                  isLoading={states.isLoading}
                  control={form.control}
                  name='StateCode'
                  label='State'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='GlobalLocationNumber' label='Glboal Location Number (GLN)' />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
