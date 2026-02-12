import { useSession } from 'next-auth/react'
import { useForm, useFormContext, useWatch, useFormState } from 'react-hook-form'
import { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Item } from 'devextreme-react/toolbar'
import { Column, CustomRule, DataGridRef, DataGridTypes, Editing } from 'devextreme-react/data-grid'
import Button from 'devextreme-react/button'
import { v4 as uuidv4 } from 'uuid'

import { WORK_ORDER_STATUS_VALUE_MAP, WorkOrderForm, WorkOrderLineItemsForm, workOrderLineItemsFormSchema } from '@/schema/work-order'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { cn, safeParseFloat } from '@/utils'
import PageHeader from '@/app/(protected)/_components/page-header'
import LoadingButton from '@/components/loading-button'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icons } from '@/components/icons'
import TooltipWrapper from '@/components/tooltip-wrapper'
import { FormDebug } from '@/components/forms/form-debug'
import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import { subtract } from 'mathjs'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { upsertWorkOrderLineItems } from '@/actions/work-order'
import { NotificationContext } from '@/context/notification'

type WorkOrderLineItemsFormProps = {
  workOrderCode: number
  projectName?: string
  projectGroupName?: string
  isOpen?: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  projectItems: ReturnType<typeof useProjecItems>
  workOrderItems: ReturnType<typeof useWoItemsByWoCode>
  workOrderStatus: number
}

export default function WorkOrderLineItemForm({
  workOrderCode,
  projectName,
  projectGroupName,
  isOpen,
  setIsOpen,
  projectItems,
  workOrderItems,
  workOrderStatus,
}: WorkOrderLineItemsFormProps) {
  const { data: session } = useSession()

  const dataGridRef = useRef<DataGridRef | null>(null)

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-work-order-project-item'
  const DATAGRID_UNIQUE_KEY = 'work-orders-project-items'

  // const notificationContext = useContext(NotificationContext)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const [projectItemsDataSource, setProjectItemsDataSource] = useState<Record<string, any>[]>([])
  const [gridKey, setGridKey] = useState(uuidv4())

  const currLineItems = useMemo(() => {
    if (workOrderItems.isLoading || workOrderItems.data.length < 1) return []

    return workOrderItems.data.map((woItem) => {
      const totalStock = safeParseFloat(woItem.projectItem.totalStock)
      const stockIn = safeParseFloat(woItem.projectItem.stockIn)
      const availableToOrder = subtract(totalStock, stockIn)
      const qty = safeParseFloat(woItem.qty)

      return {
        projectItemCode: woItem.projectItemCode,
        qty,
        maxQty: availableToOrder,
        isDelivered: woItem.isDelivered,
      }
    })
  }, [JSON.stringify(workOrderItems)])

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(workOrderLineItemsFormSchema),
  })

  const lineItems = useWatch({ control: form.control, name: 'lineItems' }) || []
  const { errors } = useFormState({ control: form.control })

  const upsertWorkOrderLineItemsData = useAction(upsertWorkOrderLineItems)

  const selectedRowKeys = useMemo(() => {
    if (lineItems.length < 1) return []
    return lineItems.map((wo) => wo.projectItemCode)
  }, [JSON.stringify(lineItems), JSON.stringify(currLineItems)])

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const isLocked = useMemo(() => {
    return workOrderStatus >= WORK_ORDER_STATUS_VALUE_MAP['In Process'] || isBusinessPartner
  }, [workOrderStatus, isBusinessPartner])

  const errorMessage = useMemo(() => {
    const noLineItemsError = errors?.lineItems?.message || ''
    if (noLineItemsError) return noLineItemsError

    const inValidQtysErrors = errors.lineItems?.length
    if (inValidQtysErrors && inValidQtysErrors > 0) return 'Please enter a valid quantity for the selected item(s).'

    form.clearErrors('lineItems')
    return ''
  }, [JSON.stringify(errors)])

  const handleOnSelectionChanged = (e: DataGridTypes.SelectionChangedEvent) => {
    const instance = e.component
    const currentDeselectedRowKeys = e.currentDeselectedRowKeys

    //* exclude selection are row with the availableToOrder is 0
    const allowData = e.selectedRowsData.filter((row) => row.availableToOrder > 0)

    const values = allowData.map((row) => ({
      projectItemCode: row.projectItemCode,
      qty: row.qty,
      maxQty: row.availableToOrder,
      isDelivered: false,
    }))

    if (values.length < 1) instance.deselectAll()

    //* if row is deselected, clear the qty and update the projectItemsDataSource
    if (currentDeselectedRowKeys.length > 0) {
      setProjectItemsDataSource((prev) => {
        return prev.map((pItem) => ({
          ...pItem,
          qty: currentDeselectedRowKeys.includes(pItem.projectItemCode) ? 0 : pItem.qty,
        }))
      })
    }

    form.setValue('lineItems', values)
  }

  const handleOnCellPrepared = (e: DataGridTypes.CellPreparedEvent) => {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement
    const intance = e.component

    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      const isBlocked = data?.availableToOrder < 1 //* hide checkbox if row is out of stock
      const isSelected = intance.isRowSelected(data?.projectItemCode)

      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (isBlocked && checkbox) {
          checkbox.style.display = 'none'
        }
      }

      //*  Highlight qty cell when invalid
      if (column?.dataField === 'qty') {
        if (isSelected && data?.qty < 1 && data?.availableToOrder > 0) {
          cellElement.style.border = '1px solid rgb(237, 28, 36)'
        }
      }
    }
  }

  const handleOnEditorPreparing = (e: DataGridTypes.EditorPreparingEvent) => {
    if (e.parentType === 'dataRow' && e.dataField === 'qty') {
      const rowData = e.row?.data
      const isSelected = e.component.isRowSelected(e.row?.key)

      //* if row is selected and item is out of stock, then disable editor
      if (isSelected && rowData?.availableToOrder < 1) {
        e.editorOptions.readOnly = true
        return
      }

      e.editorOptions.readOnly = !isSelected
    }
  }

  const handleOnRowUpdated = useCallback(
    (e: DataGridTypes.RowUpdatedEvent<any, any>) => {
      const key = e.key
      const updatedRows = [...projectItemsDataSource]
      const updatedLineItems = [...lineItems]

      const rowIndex = updatedRows.findIndex((x) => x.projectItemCode === key)
      const lineItemIndex = updatedLineItems.findIndex((x) => x.projectItemCode === key)

      if (rowIndex !== -1) {
        updatedRows[rowIndex] = e.data //* update rows

        updatedLineItems[lineItemIndex] = {
          projectItemCode: e.data?.projectItemCode,
          qty: e.data?.qty,
          maxQty: e.data?.availableToOrder,
          isDelivered: e.data?.isDelivered,
        }

        form.setValue('lineItems', updatedLineItems) //* update line items
        setProjectItemsDataSource(updatedRows) //* update local datasource state
      }
    },
    [JSON.stringify(projectItemsDataSource), JSON.stringify(currLineItems), JSON.stringify(lineItems)]
  )

  const handleClose = useCallback(() => {
    form.reset()
    setIsOpen(false)

    //* deselect all rows
    if (dataGridRef.current) {
      const intance = dataGridRef.current.instance()
      intance.deselectAll()
    }
  }, [dataGridRef.current])

  const handleOnSubmit = async (formData: WorkOrderLineItemsForm) => {
    try {
      const response = await upsertWorkOrderLineItemsData.executeAsync({ lineItems: formData.lineItems, workOrderCode })
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.workOrderItem) {
        // notificationContext?.handleRefresh()
        workOrderItems.execute({ workOrderCode })

        setTimeout(() => {
          handleClose()
        }, 1000)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  //* set local state project items data source combined with the data of the line items e.g qty, isDelivered, etc
  useEffect(() => {
    if (!isOpen) return

    if (!projectItems.isLoading && projectItems.data.length > 0) {
      const pItems = projectItems.data
        .map((pItem) => {
          const lineItem = currLineItems.find((li) => li.projectItemCode === pItem.code)
          const itemMaster = pItem?.item
          const isDeleted = pItem?.deletedAt || pItem?.deletedBy

          if (isDeleted || !itemMaster) return null

          const cost = safeParseFloat(pItem?.cost)
          const qty = safeParseFloat(lineItem?.qty)
          const availableToOrder = safeParseFloat(pItem?.availableToOrder)
          const stockIn = safeParseFloat(pItem?.stockIn)
          const stockOut = safeParseFloat(pItem?.stockOut)
          const totalStock = safeParseFloat(pItem?.totalStock)

          const warehouse = pItem?.warehouse
          const dateReceivedBy = pItem?.dateReceivedByUser ? [pItem?.dateReceivedByUser?.fname, pItem?.dateReceivedByUser?.lname].filter(Boolean).join(' ') : '' // prettier-ignore

          return {
            projectItemCode: pItem?.code,
            ItemCode: itemMaster?.ItemCode || '',
            FirmName: itemMaster?.FirmName || '',
            ItemName: itemMaster?.ItemName || '',
            partNumber: pItem?.partNumber || '',
            dateCode: pItem?.dateCode || '',
            countryOfOrigin: pItem?.countryOfOrigin || '',
            lotCode: pItem?.lotCode || '',
            palletNo: pItem?.palletNo || '',
            warehouse: warehouse?.name || '',
            dateReceived: pItem?.dateReceived,
            dateReceivedBy,
            packagingType: pItem?.packagingType || '',
            spq: pItem?.spq || '',
            availableToOrder,
            stockIn,
            stockOut,
            totalStock,
            cost,
            qty,
            isDelivered: lineItem?.isDelivered ?? false,
            notes: pItem?.notes || '',
            siteLocation: pItem?.siteLocation || '',
            subLocation2: pItem?.subLocation2 || '',
            subLocation3: pItem?.subLocation3 || '',
          }
        })
        .filter((item) => item !== null)

      setProjectItemsDataSource(pItems)
    } else setProjectItemsDataSource([])
  }, [JSON.stringify(currLineItems), JSON.stringify(projectItems), isOpen])

  //* set grid key when isOpen state change, grid key will be used to trigger force re-render
  //* set also line items based on currentLineItems
  useEffect(() => {
    setGridKey(uuidv4())
    form.setValue('lineItems', currLineItems)
  }, [isOpen, form])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (projectItems.isLoading || workOrderItems.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [projectItems.isLoading, workOrderItems.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col gap-3'>
      <PageHeader
        title='Add Line Item(s)'
        description={`Select item(s) from the project and set the quantity to add to the work order.`}
        className='bg-transparent p-0 shadow-none'
      >
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={handleClose} />
        </Item>

        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <TooltipWrapper label='Save' targetId='save-button'>
            <LoadingButton
              text='Save'
              type='default'
              icon='save'
              stylingMode='contained'
              isLoading={false}
              disabled={isLocked || upsertWorkOrderLineItemsData.isExecuting}
              onClick={() => form.handleSubmit(handleOnSubmit)()}
            />
          </TooltipWrapper>
        </Item>

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </PageHeader>

      {errorMessage && <div className='text-sm text-red-500'>{errorMessage}</div>}

      <div className='flex items-center gap-2 rounded-md bg-white p-4 shadow-md'>
        <Icons.clipboadList className='size-8 text-slate-400' />
        <div className='flex flex-col justify-center'>
          <h1 className='text-base font-bold tracking-tight sm:text-lg md:text-lg lg:text-left lg:text-xl'>
            {projectName}'s project items
          </h1>
          <p className='line-clamp-1 text-slate-500 md:text-sm lg:text-left'>{projectGroupName}</p>
        </div>
      </div>

      {/* <FormDebug form={form} /> */}

      <PageContentWrapper className='h-[calc(100%_-_165px)]'>
        <CommonDataGrid
          key={gridKey} //* changing the gridKey state will force the datagrid to rerender */
          dataGridRef={dataGridRef}
          data={projectItemsDataSource}
          storageKey={DATAGRID_STORAGE_KEY}
          isLoading={projectItems.isLoading}
          keyExpr='projectItemCode'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{
            onCellPrepared: handleOnCellPrepared,
            onSelectionChanged: handleOnSelectionChanged,
            onRowUpdated: handleOnRowUpdated,
            onEditorPreparing: handleOnEditorPreparing,
          }}
        >
          <Column dataField='projectItemCode' dataType='string' minWidth={100} caption='ID' allowEditing={false} sortOrder='asc' />
          <Column dataField='ItemCode' dataType='string' caption='MFG P/N' allowEditing={false} />
          <Column dataField='FirmName' dataType='string' caption='Manufacturer' allowEditing={false} />
          <Column dataField='partNumber' dataType='string' caption='Part Number' allowEditing={false} />
          <Column dataField='ItemName' dataType='string' caption='Description' allowEditing={false} />
          <Column dataField='dateCode' dataType='string' caption='Date Code' allowEditing={false} />
          <Column dataField='countryOfOrigin' dataType='string' caption='Country Of Origin' allowEditing={false} />
          <Column dataField='lotCode' dataType='string' caption='Lot Code' allowEditing={false} />
          <Column dataField='palletNo' dataType='string' caption='Pallet No' allowEditing={false} />
          <Column dataField='siteLocation' dataType='string' caption='Site Location' allowEditing={false} />
          <Column dataField='subLocation2' dataType='string' caption='Sub Location 2' allowEditing={false} />
          <Column dataField='subLocation3' dataType='string' caption='Sub Location 3' allowEditing={false} />

          {!isBusinessPartner ? (
            <>
              <Column dataField='dateReceived' dataType='datetime' caption='Date Received' allowEditing={false} />
              <Column dataField='dateReceivedBy' dataType='string' caption='Date Received By' allowEditing={false} />
            </>
          ) : null}

          <Column dataField='packagingType' dataType='string' caption='Packaging Type' allowEditing={false} />
          <Column dataField='spq' dataType='string' caption='SPQ' allowEditing={false} />
          <Column dataField='cost' dataType='number' caption='SPQ' alignment='left' format={DEFAULT_CURRENCY_FORMAT} allowEditing={false} />
          <Column
            dataField='availableToOrder'
            dataType='number'
            caption='Available To Order'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            allowEditing={false}
            fixed
            fixedPosition='right'
          />
          <Column
            dataField='stockIn'
            dataType='number'
            caption='Stock-In (In Process)'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            allowEditing={false}
          />
          <Column
            dataField='stockOut'
            dataType='number'
            caption='Stock-Out (Delivered)'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            allowEditing={false}
          />
          <Column
            dataField='qty'
            dataType='number'
            caption={`Quantity${isLocked ? ' (Locked)' : ''}`}
            format={DEFAULT_NUMBER_FORMAT}
            alignment='left'
            allowEditing={isLocked ? false : true}
            cssClass={cn(isLocked ? '!bg-slate-100' : '')}
            fixed
            fixedPosition='right'
          >
            <CustomRule
              validationCallback={(e) => {
                const data = e?.data
                return data?.qty >= 1 && data?.qty <= data?.availableToOrder
              }}
              message='Quantity must be greater than 1 and less than or equal to the available to order'
            />
          </Column>
          <Column dataField='notes' dataType='string' caption='SPQ' visible={false} allowEditing={false} />

          {!isBusinessPartner ? (
            <Column
              dataField='totalStock'
              dataType='number'
              caption='Total Stock'
              alignment='left'
              format={DEFAULT_NUMBER_FORMAT}
              allowEditing={false}
            />
          ) : null}

          <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
        </CommonDataGrid>
      </PageContentWrapper>
    </div>
  )
}
