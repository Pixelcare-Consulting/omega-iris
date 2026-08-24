'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { Dispatch, SetStateAction, useContext, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import LoadingButton from '@/components/loading-button'
import SelectBoxField from '@/components/forms/select-box-field'
import ReadOnlyField from '@/components/read-only-field'
import TextBoxField from '@/components/forms/text-box-field'
import { NotificationContext } from '@/context/notification'
import { type BinLocationForm, whBinLocationFormSchema } from '@/schema/warehouse'
import { upsertWarehouseBinLocation } from '@/actions/warehouse-bin-location'
import { getWarehouseBinLocations } from '@/actions/warehouse-bin-location'
import { useWarehouseBinLocations } from '@/hooks/safe-actions/warehouse-bin-location'
import { useWarehouseSubLevelCodes } from '@/hooks/safe-actions/warehouse-sublevel-codes'
import FormMessage from '@/components/forms/form-message'

type WarehouseBinLocationFormProps = {
  warehouseCode: string
  warehouseName: string
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  binLocation: Awaited<ReturnType<typeof getWarehouseBinLocations>>[number] | null
  binLocations: ReturnType<typeof useWarehouseBinLocations>
  sublevel1Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel2Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel3Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel4Codes: ReturnType<typeof useWarehouseSubLevelCodes>
}

export default function WarehouseBinLocationForm({
  warehouseCode,
  warehouseName,
  setIsOpen,
  onClose,
  binLocation,
  binLocations,
  sublevel1Codes,
  sublevel2Codes,
  sublevel3Codes,
  sublevel4Codes,
}: WarehouseBinLocationFormProps) {
  const router = useRouter()

  const isCreate = !binLocation

  const notificationContext = useContext(NotificationContext)

  const values = useMemo(() => {
    if (binLocation) return binLocation

    if (isCreate) {
      return {
        code: -1,
        WarehouseCode: warehouseCode,
        Description: null,
        BinCode: '',
        SL1Code: '',
        SL2Code: null,
        SL3Code: null,
        SL4Code: null,
      }
    }
  }, [isCreate, JSON.stringify(binLocation)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(whBinLocationFormSchema),
  })

  const formState = useFormState({ control: form.control })
  const { executeAsync, isExecuting } = useAction(upsertWarehouseBinLocation)

  const binCode = useWatch({ control: form.control, name: 'BinCode' })
  const sl1Code = useWatch({ control: form.control, name: 'SL1Code' })
  const sl2Code = useWatch({ control: form.control, name: 'SL2Code' })
  const sl3Code = useWatch({ control: form.control, name: 'SL3Code' })
  const sl4Code = useWatch({ control: form.control, name: 'SL4Code' })

  const resetForm = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  const handleClose = () => {
    if (onClose) onClose()
    setTimeout(() => resetForm(), 100)
    setIsOpen(false)
  }

  //* set bin code
  useEffect(() => {
    const binCodeArray = [warehouseCode, sl1Code, sl2Code, sl3Code, sl4Code].filter(Boolean)
    form.setValue('BinCode', binCodeArray.join('-'))
  }, [warehouseCode, sl1Code, sl2Code, sl3Code, sl4Code])

  const handleOnSubmit = async (formData: BinLocationForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('BinCode', { type: 'custom', message: result.message })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.warehouseBinLocation && 'id' in result?.data?.warehouseBinLocation) {
        router.refresh()
        // notificationContext?.handleRefresh()
        binLocations.execute({ warehouseCode })

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

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-3' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader
          title={`Add Bin Location to ${warehouseName}`}
          description={
            isCreate ? 'Fill in the form to create a new bin location for this warehouse.' : 'Edit the form to update this bin location.'
          }
          className='bg-transparent p-0 shadow-none'
        >
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={handleClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>
        </PageHeader>

        <PageContentWrapper className='shadow-none'>
          <ScrollView useNative>
            <div className='grid h-full grid-cols-12 gap-5 py-2 pr-4'>
              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Warehouse Code' value={warehouseCode} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Warehouse Name' value={warehouseName} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Code' value={binCode} />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={sublevel1Codes.data}
                  isLoading={sublevel1Codes.isLoading}
                  control={form.control}
                  name='SL1Code'
                  label='Area'
                  valueExpr='Code'
                  displayExpr='Code'
                  searchExpr={['Code', 'Description']}
                  isRequired
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={sublevel2Codes.data}
                  isLoading={sublevel2Codes.isLoading}
                  control={form.control}
                  name='SL2Code'
                  label='Location'
                  valueExpr='Code'
                  displayExpr='Code'
                  searchExpr={['Code', 'Description']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={sublevel3Codes.data}
                  isLoading={sublevel3Codes.isLoading}
                  control={form.control}
                  name='SL3Code'
                  label='Company'
                  valueExpr='Code'
                  displayExpr='Code'
                  searchExpr={['Code', 'Description']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={sublevel4Codes.data}
                  isLoading={sublevel4Codes.isLoading}
                  control={form.control}
                  name='SL4Code'
                  label='Palette/Box'
                  valueExpr='Code'
                  displayExpr='Code'
                  searchExpr={['Code', 'Description']}
                />
              </div>

              <div className='col-span-12'>
                <TextBoxField control={form.control} name='Description' label='Description' />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
