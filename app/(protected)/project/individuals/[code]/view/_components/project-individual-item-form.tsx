'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type ProjectItemForm, projectItemFormSchema } from '@/schema/project-item'
import LoadingButton from '@/components/loading-button'
import { upsertProjectItem } from '@/actions/project-item'
import SelectBoxField from '@/components/forms/select-box-field'
import { commonItemRender } from '@/utils/devextreme'
import SwitchField from '@/components/forms/switch-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Separator from '@/components/separator'
import { useWarehouseClient } from '@/hooks/safe-actions/warehouse'
import { getProjecItems } from '@/actions/project-item'
import useItemsClient from '@/hooks/safe-actions/item'
import { useProjectItemWarehouseInventoryByPItemCodeClient } from '@/hooks/safe-actions/project-item-warehouse-inventory'
import ReadOnlyField from '@/components/read-only-field'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import { safeParseFloat } from '@/utils'
import ProjectIndividualItemWarehouseForm from './project-individual-item-warehouse-inventory-form'
import { useProjecItemsClient } from '@/hooks/safe-actions/project-item'

type ProjectItemFormProps = {
  projectCode: number
  projectName: string
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  item: Awaited<ReturnType<typeof getProjecItems>>[number] | null
  items: ReturnType<typeof useProjecItemsClient>
  warehouses: ReturnType<typeof useWarehouseClient>
}

export default function ProjectItemForm({
  projectCode,
  projectName,
  isOpen,
  setIsOpen,
  onClose,
  item,
  items,
  warehouses,
}: ProjectItemFormProps) {
  const router = useRouter()

  const isCreate = !item

  const values = useMemo(() => {
    if (item) return { ...item, warehouseInventory: [] }

    if (isCreate) {
      return {
        code: -1,
        itemCode: 0,
        projectIndividualCode: projectCode,
        isActive: true,
        notes: null,
        warehouseInventory: [],
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(item)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(projectItemFormSchema),
  })

  const itemCode = useWatch({ control: form.control, name: 'itemCode' })
  const { executeAsync, isExecuting } = useAction(upsertProjectItem)

  const baseItems = useItemsClient()
  const pItemWarehouseInventories = useProjectItemWarehouseInventoryByPItemCodeClient(item?.code)

  const baseItem = useMemo(() => {
    if (baseItems.isLoading || baseItems.data.length < 1) return null
    return baseItems.data.find((i) => i.code === itemCode)
  }, [itemCode, JSON.stringify(baseItems)])

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
  }, [isOpen, JSON.stringify(item), isCreate, JSON.stringify(warehouses)])

  //* set warehoise inventoryt when edit based on existing warehose inventory data
  useEffect(() => {
    if (isCreate || pItemWarehouseInventories.isLoading || pItemWarehouseInventories.data.length < 1) {
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

    const values = pItemWarehouseInventories.data.map((wi) => ({
      code: wi.warehouseCode,
      name: wi.warehouse.name,
      isLocked: wi.isLocked,
      inStock: wi.inStock,
      committed: wi.committed,
      ordered: wi.ordered,
      available: wi.available,
    }))

    form.setValue('warehouseInventory', values)
  }, [isOpen, JSON.stringify(item), JSON.stringify(pItemWarehouseInventories), JSON.stringify(warehouses)])

  const resetForm = () => {
    form.reset()
    form.clearErrors()
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

        pItemWarehouseInventories.execute({ projectItemCode: result.data.projectItem.code })
        items.execute({ projectCode })

        setTimeout(() => {
          if (onClose) onClose()
          resetForm()
        }, 1500)
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

            <div className='grid h-full grid-cols-12 gap-5 pr-4'>
              <ReadOnlyField
                className='col-span-12 lg:col-span-3'
                value={
                  <img
                    src={baseItem?.thumbnail || '/images/placeholder-img.jpg'}
                    className='size-[280px] w-full rounded-2xl object-cover object-center'
                  />
                }
              />

              <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
                <div className='col-span-12'>
                  <SelectBoxField
                    data={baseItems.data}
                    isLoading={baseItems.isLoading}
                    control={form.control}
                    name='itemCode'
                    label='Item'
                    valueExpr='code'
                    displayExpr='name'
                    searchExpr={['name', 'code']}
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

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer' value={baseItem?.manufacturer || ''} />

                <ReadOnlyField className='col-span-12 md:col-span-6' title='MFG P/N' value={baseItem?.manufacturerPartNumber || ''} />

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={baseItem?.description || ''} />

                <div className='col-span-12 md:col-span-6'>
                  <SwitchField
                    control={form.control}
                    name='isActive'
                    label='Active'
                    description='Is this item active?'
                    extendedProps={{ switchOptions: { disabled: isCreate } }}
                  />
                </div>

                <ReadOnlyField className='col-span-12' title='Notes' value={baseItem?.notes || ''} />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='SAP Fields' description='SAP related fields' />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Code' value={baseItem?.ItemCode || ''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Manufacturer Code'
                value={baseItem?.FirmCode || ''}
              />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Manufacturer Name' value={''} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Description' value={baseItem?.ItemName || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Code' value={baseItem?.ItmsGrpCod || ''} />

              <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Group Name' value={''} />

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-4'
                title='Price'
                value={formatNumber(safeParseFloat(baseItem?.Price), DEFAULT_CURRENCY_FORMAT)}
              />

              <ProjectIndividualItemWarehouseForm isLoading={pItemWarehouseInventories.isLoading} />
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
