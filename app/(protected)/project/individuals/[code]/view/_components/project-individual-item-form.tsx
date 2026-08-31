'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { subtract } from 'mathjs'
import DataGrid, { Column, Selection, Scrolling, Paging, FilterRow, DataGridTypes, DataGridRef } from 'devextreme-react/data-grid'

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
import { getBatchMasterByItemCodeDistNumberWarehouseCodeBinCodeClient } from '@/actions/batches'
import useItems from '@/hooks/safe-actions/item'
import ReadOnlyField from '@/components/read-only-field'
import ProjectIndividualItemSapInventory from './project-individual-item-sap-inventory'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { safeParseFloat, safeParseInt } from '@/utils'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouseBinLocations } from '@/hooks/safe-actions/warehouse-bin-location'
import { useWarehousesByProjectCode } from '@/hooks/safe-actions/warehouse'
import TextBoxField from '@/components/forms/text-box-field'
import NumberBoxField from '@/components/forms/number-box-field'
import DateBoxField from '@/components/forms/date-box-field'
import useUsers from '@/hooks/safe-actions/user'
import TextAreaField from '@/components/forms/text-area-field'
import { FormDebug } from '@/components/forms/form-debug'
import DropDownBoxField from '@/components/forms/drop-down-field'
import { NotificationContext } from '@/context/notification'
import { parseSapCompactDate } from '@/utils/sap'

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

  // const notificationContext = useContext(NotificationContext)

  const values = useMemo(() => {
    if (item) return item

    if (isCreate) {
      return {
        code: -1,
        itemCode: 0,
        projectIndividualCode: projectCode,
        warehouseCode: null,
        binCode: null,
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
        siteLocation: '',
        subLocation2: null,
        subLocation3: null,
        notes: null,
        owner: null,
        mfr: null,
        desc: null,
        commodities: null,
        group: null,
        division: null,
        site: null,
        cmSite: null,
        phase: null,
        tfsStdPrice: 0,
        omegaPrice: 0,
        DistNumber: null,
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
  const binCode = useWatch({ control: form.control, name: 'binCode' })
  const itemCode = useWatch({ control: form.control, name: 'itemCode' })

  //* watching the batch number would re-render this whole form on every keystroke, so take it from the text
  //* box's debounced callback instead - the lookup only cares about the value once the user stops typing
  const [distNumber, setDistNumber] = useState<string | null>(item?.DistNumber ?? null)

  const handleDistNumberChanged = useCallback((args: { value?: string | null }) => {
    setDistNumber(args?.value?.trim() || null)
  }, [])

  //* a field is only dirty once its value differs from the loaded item, which is exactly "the user changed it"
  const { dirtyFields } = useFormState({ control: form.control })

  const totalStock = useWatch({ control: form.control, name: 'totalStock' })
  const stockIn = useWatch({ control: form.control, name: 'stockIn' })

  const { executeAsync, isExecuting } = useAction(upsertProjectItem)
  const batchMasterData = useAction(getBatchMasterByItemCodeDistNumberWarehouseCodeBinCodeClient)

  const availableToOrder = useMemo(() => {
    return subtract(safeParseFloat(totalStock), safeParseFloat(stockIn))
  }, [JSON.stringify(totalStock), JSON.stringify(stockIn)])

  const selectedBaseItem = useMemo(() => {
    if (itemMasters.isLoading || itemMasters.data.length < 1) return null
    return itemMasters.data.find((i) => i.code === itemCode)
  }, [itemCode, itemMasters.data, itemMasters.isLoading])

  const itemCodeOnSelectionChanged = useCallback((e: DataGridTypes.SelectionChangedEvent): void => {
    if (e.selectedRowKeys.length === 0) return

    const currentValue = form.getValues('itemCode')
    const newValue = e.selectedRowKeys[0]

    if (newValue === currentValue) return

    form.setValue('itemCode', newValue)
  }, [])

  //* only the warehouses assigned to this project can be picked for its items
  const projectWarehouses = useWarehousesByProjectCode(projectCode)
  const binLocations = useWarehouseBinLocations(warehouseCode ?? '')

  const warehouseOptions = useMemo(() => {
    if (projectWarehouses.isLoading || projectWarehouses.data.length < 1) return []
    return projectWarehouses.data.map((w) => ({ label: w.WarehouseName, value: w.WarehouseCode }))
  }, [projectWarehouses.data, projectWarehouses.isLoading])

  const binLocationOptions = useMemo(() => {
    if (binLocations.isLoading || binLocations.data.length < 1) return []
    return binLocations.data.map((b) => ({ label: b.BinCode, value: b.BinCode }))
  }, [binLocations.data, binLocations.isLoading])

  //* devextreme fires onValueChanged for programmatic value changes too, so remember what the warehouse
  //* actually was, otherwise loading an existing item would look like a change and wipe its saved bin.
  //* seeded from the loaded item so the first change a user makes is never mistaken for that first paint
  const previousWarehouseCodeRef = useRef<string | null>(item?.warehouseCode ?? null)

  //* a bin belongs to a single warehouse, so drop the current one whenever the warehouse really changes
  const handleWarehouseChanged = useCallback((args: { value?: string | null }) => {
    const nextWarehouseCode = args?.value || null
    const previousWarehouseCode = previousWarehouseCodeRef.current

    previousWarehouseCodeRef.current = nextWarehouseCode

    if (previousWarehouseCode === nextWarehouseCode) return

    if (form.getValues('binCode')) form.setValue('binCode', null)
  }, [])

  //* a batch row in sap is identified by all four of these, so any of them changing means a different batch
  const batchLookup = useMemo(
    () => ({
      itemCode: selectedBaseItem?.ItemCode || null,
      warehouseCode: warehouseCode || null,
      binCode: binCode || null,
      distNumber: distNumber || null,
    }),
    [selectedBaseItem?.ItemCode, warehouseCode, binCode, distNumber]
  )

  //* what we last asked sap for, so the same batch is never fetched twice in a row
  const lastBatchLookupRef = useRef<string | null>(null)

  //* batch numbers are unique per item, so pull the batch from sap and fill in what it already knows
  const fetchBatchDetails = useCallback(
    ({
      itemCode,
      warehouseCode,
      binCode,
      distNumber,
    }: {
      itemCode: string
      warehouseCode: string
      binCode: string
      distNumber: string
    }) => {
      console.log('zzzzz')

      toast.promise(batchMasterData.executeAsync({ itemCode, distNumber, warehouseCode, binCode }), {
        loading: 'Fetching batch details...',
        success: (response) => {
          if (!response) throw { message: 'Failed to fetch batch details!', unExpectedError: true }

          const batch = response?.data

          if (!batch) throw { message: `Batch "${distNumber}" was not found for this item!`, expectedError: true }

          //* sap is the source of truth for these, so overwrite whatever is currently in the form
          form.setValue('warehouseCode', batch.WhsCode ?? null)
          form.setValue('binCode', batch.BinCode ?? null)
          form.setValue('partNumber', batch.U_PartNumber ?? null)
          form.setValue('dateCode', batch.U_DateCode ?? null)
          form.setValue('countryOfOrigin', batch.MnfSerial ?? null)
          form.setValue('lotCode', batch.U_LotCode ?? null)
          form.setValue('packagingType', batch.U_PackagingType ?? null)
          form.setValue('spq', batch.U_SPQ ?? null)
          form.setValue('owner', batch.U_Owner ?? null)
          form.setValue('group', batch.U_Group ?? null)
          form.setValue('division', batch.U_Division ?? null)
          form.setValue('commodities', batch.U_Commodities ?? null)
          form.setValue('site', batch.U_Site ?? null)
          form.setValue('cmSite', batch.U_CMSite ?? null)
          form.setValue('phase', safeParseInt(batch.U_Phase) || null)
          form.setValue('totalStock', safeParseFloat(batch.Quantity))
          form.setValue('dateReceived', parseSapCompactDate(batch.InDate) ?? null)
          form.setValue('notes', batch.Notes ?? null)

          //* the bin belongs to the batch's warehouse, keep the guard in sync so it isn't wiped after this
          previousWarehouseCodeRef.current = batch.WhsCode ?? null

          return `Batch "${distNumber}" details applied.`
        },
        error: (err: Error & { expectedError: boolean }) => {
          return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
        },
      })
    },
    []
  )

  //* only go to sap once the user has actually touched one of the four fields, never on the initial paint of
  //* an item being edited, otherwise loading a saved item would overwrite it with sap's values straight away
  useEffect(() => {
    const isTouched = Boolean(dirtyFields.itemCode || dirtyFields.warehouseCode || dirtyFields.binCode || dirtyFields.DistNumber)

    if (!isTouched) return

    const { itemCode, warehouseCode, binCode, distNumber } = batchLookup

    if (!itemCode || !warehouseCode || !binCode || !distNumber) return

    const key = [itemCode, warehouseCode, binCode, distNumber].join('|')

    //* the response writes warehouse/bin back, which re-runs this effect with the very same lookup
    if (key === lastBatchLookupRef.current) return

    lastBatchLookupRef.current = key

    console.log('runn...xx')

    fetchBatchDetails({ itemCode, warehouseCode, binCode, distNumber })
  }, [batchLookup, dirtyFields.itemCode, dirtyFields.warehouseCode, dirtyFields.binCode, dirtyFields.DistNumber])

  //* switching to a different saved item starts a fresh lookup history
  useEffect(() => {
    lastBatchLookupRef.current = null
  }, [item?.code])

  const resetForm = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  const handleOnSubmit = async (formData: ProjectItemForm) => {
    try {
      //* the select box writes '' when cleared, but these are foreign keys so they have to go back as null
      const response = await executeAsync({
        ...formData,
        warehouseCode: formData.warehouseCode || null,
        binCode: formData.binCode || null,
      })
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
        // notificationContext?.handleRefresh()
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

  const itemCodeContentRender = useCallback(() => {
    return (
      <DataGrid
        dataSource={itemMasters.data}
        hoverStateEnabled={true}
        showBorders={true}
        onSelectionChanged={itemCodeOnSelectionChanged}
        height='100%'
        wordWrapEnabled
        columnAutoWidth={false}
        columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
        keyExpr='code'
        selectedRowKeys={itemCode ? [itemCode] : []}
      >
        <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
        <Column dataField='FirmName' dataType='string' caption='Manufacturer' />
        <Column dataField='ItemCode' dataType='string' caption='MFG P/N' />
        <Column dataField='ItemName' dataType='string' caption='Description' />

        <Selection mode='single' />
        <Scrolling mode='virtual' useNative />
        <Paging enabled={true} pageSize={10} />
        <FilterRow visible={true} />
      </DataGrid>
    )
  }, [itemCodeOnSelectionChanged, itemMasters.data, itemMasters.isLoading, itemCode])

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
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={handleClose} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
          <ScrollView useNative>
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
                  <DropDownBoxField
                    data={itemMasters.data}
                    isLoading={itemMasters.isLoading}
                    control={form.control}
                    name='itemCode'
                    label='Item'
                    valueExpr='code'
                    displayExpr='ItemCode'
                    isRequired
                    extendedProps={{
                      dropdownBoxOptions: {
                        contentRender: itemCodeContentRender,
                      },
                    }}
                  />
                </div>

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer' value={selectedBaseItem?.FirmName || ''} />

                <ReadOnlyField className='col-span-12 md:col-span-6' title='MFG P/N' value={selectedBaseItem?.ItemCode || ''} />

                <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={selectedBaseItem?.ItemName || ''} />

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
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SelectBoxField
                  data={warehouseOptions}
                  isLoading={projectWarehouses.isLoading}
                  control={form.control}
                  name='warehouseCode'
                  label='Warehouse'
                  valueExpr='value'
                  displayExpr={(item) => (item ? `${item?.label} (${item?.value})` : '')}
                  searchExpr={['label', 'value']}
                  description='Only warehouses assigned to this project'
                  callback={handleWarehouseChanged}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.label,
                          value: params?.value,
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SelectBoxField
                  data={binLocationOptions}
                  isLoading={binLocations.isLoading}
                  control={form.control}
                  name='binCode'
                  label='Bin Location'
                  valueExpr='value'
                  displayExpr='value'
                  searchExpr={['label', 'value']}
                  description={!warehouseCode ? 'Select a warehouse first' : undefined}
                  extendedProps={{ selectBoxOptions: { disabled: !warehouseCode } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField
                  control={form.control}
                  name='DistNumber'
                  label='Batch Number'
                  callback={handleDistNumberChanged}
                  callbackDebounce={1000}
                  description={
                    !itemCode || !warehouseCode || !binCode
                      ? 'Select an item, warehouse, bin location first'
                      : 'Fills the fields below from SAP'
                  }
                  extendedProps={{ textBoxOptions: { disabled: !itemCode || !warehouseCode || !binCode } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='siteLocation' label='Site Location' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation2' label='Sub Location 2' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='subLocation3' label='Sub Location 3' />
              </div>

              <Separator className='col-span-12' />

              <ProjectIndividualItemSapInventory warehouseCode={warehouseCode} itemCode={selectedBaseItem?.ItemCode} />

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Project Item' description='Project item details' />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='owner' label='Owner' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='group' label='Group' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='division' label='Division' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='site' label='Site' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='cmSite' label='CM Site' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField control={form.control} name='phase' label='Phase' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='tfsStdPrice'
                  label='TFS Standard Price'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='omegaPrice'
                  label='Omega Price'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='partNumber' label='Part Number' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='dateCode' label='DC' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='countryOfOrigin' label='COO' />
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

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='mfr' label='MFR' description='Temporary manufacturer field' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='desc' label='Desc' description='Temporary description field' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='commodities' label='Commodities' />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='notes' label='Notes' />
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
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
