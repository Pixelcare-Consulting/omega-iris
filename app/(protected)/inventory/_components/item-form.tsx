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

type ItemFormProps = { pageMetaData: PageMetadata; item: Awaited<ReturnType<typeof getItemByCode>> }

export default function ItemForm({ pageMetaData, item }: ItemFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !item

  const values = useMemo(() => {
    if (item) return item

    if (isCreate) {
      return {
        code: -1,
        manufacturerPartNumber: '',
        manufacturer: null,
        description: null,
        thumbnail: null,
        notes: null,
        isActive: true,

        //* sap fields
        ItemCode: null,
        ItemName: null,
        ItmsGrpCod: null,
        FirmCode: null,
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

  const { executeAsync, isExecuting } = useAction(upsertItem)

  const handleOnSubmit = async (formData: ItemForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('manufacturerPartNumber', { type: 'custom', message: result.message })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.item && 'id' in result?.data?.item) {
        router.refresh()

        setTimeout(() => {
          router.push(`/inventory/${result.data.item.code}`)
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
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/inventory')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {item && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/inventory/add`) }}
              />

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
                  <TextBoxField control={form.control} name='manufacturerPartNumber' label='MFG P/N' isRequired />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <TextBoxField control={form.control} name='manufacturer' label='Manufacturer' />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <TextBoxField control={form.control} name='description' label='Description' />
                </div>

                <div className='col-span-12 md:col-span-6'>
                  <SwitchField
                    control={form.control}
                    name='isActive'
                    label='Active'
                    description='Is this item active?'
                    extendedProps={{ switchOptions: { disabled: isCreate } }}
                  />
                </div>

                <div className='col-span-12'>
                  <TextAreaField control={form.control} name='notes' label='Note' />
                </div>
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='SAP Fields' description='SAP related fields' />

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='ItemCode' label='Code' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='FirmCode'
                  label='Manufacturer'
                  valueExpr='FirmCode'
                  displayExpr='label'
                  searchExpr={['FirmCode', 'FirmName']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='ItemName' label='Description' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SelectBoxField
                  data={[]}
                  control={form.control}
                  name='ItmsGrpCod'
                  label='Group'
                  valueExpr='ItmsGrpCod'
                  displayExpr='label'
                  searchExpr={['ItmsGrpCod', 'ItmsGrpNam']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <NumberBoxField
                  control={form.control}
                  name='Price'
                  label='Price'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
