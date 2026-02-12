'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Tooltip from 'devextreme-react/tooltip'
import DataGrid, {
  Column,
  ColumnFixing,
  DataGridRef,
  DataGridTypes,
  Editing,
  Item,
  LoadPanel,
  Pager,
  Paging,
  Scrolling,
  SearchPanel,
  Sorting,
  Toolbar,
} from 'devextreme-react/data-grid'
import Button from 'devextreme-react/button'

import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { handleOnRowPrepared } from '@/utils/devextreme'
import { Icons } from '@/components/icons'
import { WORK_ORDER_STATUS_OPTIONS, WorkOrderStatusUpdateForm } from '@/schema/work-order'
import { useFormContext, useWatch } from 'react-hook-form'
import AlertDialog from '@/components/alert-dialog'

type WorkOrderLineItemsTobeDeliverProps = {
  workOrderCodes: number[]
  showConfirmation: boolean
  setShowConfirmation: React.Dispatch<React.SetStateAction<boolean>>
}

function WorkOrderLineItemsTobeDeliver({ workOrderCodes, showConfirmation, setShowConfirmation }: WorkOrderLineItemsTobeDeliverProps) {
  const form = useFormContext<WorkOrderStatusUpdateForm>()

  const wosFormField = useWatch({ control: form.control, name: 'workOrders' }) || []

  const dataGridRef = useRef<DataGridRef | null>(null)

  const woItems = useWoItemsByWoCode(workOrderCodes)

  const [workOrderIndex, setWorkOrderIndex] = useState(0)

  const [workOrdersLineItems, setWorkOrdersLineItems] = useState<ReturnType<typeof useWoItemsByWoCode>['data']>([]) // prettier-ignore

  const currentWorkOrderCode = useMemo(() => {
    if (workOrderCodes.length < 1) return null
    const wo = workOrderCodes[workOrderIndex] ?? null
    return wo
  }, [JSON.stringify(workOrderCodes), workOrderIndex])

  const currentWorkOrderLineItems = useMemo(() => {
    if (currentWorkOrderCode === null || wosFormField.length < 1 || workOrdersLineItems.length < 1) return []

    return workOrdersLineItems
      .filter((woItem) => woItem.workOrderCode === currentWorkOrderCode)
      .map((woItem) => {
        const workOrderFormField = wosFormField.find((wo) => wo.code === woItem.workOrderCode)
        const deliveredProjectItems = workOrderFormField?.deliveredProjectItems ?? []

        //* the isDelivered column is the current value of delivered in db before loading in the form
        //* if isDelivered is true disable the checkbox , otherwise enable it for editing
        return { ...woItem, delivered: deliveredProjectItems.includes(woItem.projectItemCode) }
      })
  }, [JSON.stringify(wosFormField), JSON.stringify(currentWorkOrderCode), JSON.stringify(workOrdersLineItems)])

  const handleOnRowUpdated = useCallback(
    (e: DataGridTypes.RowUpdatedEvent<any, any>) => {
      const data = e.data
      const projectItemCode = data?.projectItemCode

      const index = e.key
      const updatedRows = [...currentWorkOrderLineItems]
      const rowIndex = updatedRows.findIndex((x) => x.projectItemCode === index)

      //* only update if isDelivered column is false and the row is !== -1 means it exist
      if (rowIndex !== -1 && !data.isDelivered) {
        updatedRows[rowIndex] = data

        //* update wosFormField
        const workOrderFormFieldElementIndex = wosFormField.findIndex((wo) => wo.code === e.data.workOrderCode)

        if (workOrderFormFieldElementIndex !== -1) {
          const currWoFormFieldElement = wosFormField[workOrderFormFieldElementIndex]
          const currWoFormFieldElementDeliveredProjectItems = currWoFormFieldElement?.deliveredProjectItems || []

          let updatedDeliveredProjectItems = []

          //* if projectItemCode is not in currWoFormFieldElementDeliveredProjectItems, then add it, otherwise remove it
          if (currWoFormFieldElementDeliveredProjectItems.includes(projectItemCode)) {
            updatedDeliveredProjectItems = currWoFormFieldElementDeliveredProjectItems.filter((pItemCode) => pItemCode !== projectItemCode)
          } else updatedDeliveredProjectItems = [...currWoFormFieldElementDeliveredProjectItems, projectItemCode]

          //* update deliveredProjectItems
          form.setValue(`workOrders.${workOrderFormFieldElementIndex}`, {
            ...currWoFormFieldElement,
            deliveredProjectItems: updatedDeliveredProjectItems,
          })
        }
      }
    },
    [JSON.stringify(currentWorkOrderLineItems), JSON.stringify(wosFormField)]
  )

  const handlePrevoiusWorkOrder = () => {
    setWorkOrderIndex((prev) => prev - 1)
  }

  const handleNextWorkOrder = () => {
    setWorkOrderIndex((prev) => prev + 1)
  }

  //* set local state work orders line items data source and set workOrders form field
  useEffect(() => {
    if (woItems.isLoading || woItems.data.length < 1) setWorkOrdersLineItems([])
    else {
      const lineItemsValue = woItems.data.map((woItem) => woItem)

      //* set local state
      setWorkOrdersLineItems(lineItemsValue)

      //* set deliveredProjectItems form field
      workOrderCodes.map((woCode, index) => {
        const woItem = lineItemsValue
          .filter((li) => li.workOrderCode === woCode)
          .filter((li) => li.isDelivered)
          .map((li) => li.projectItemCode)
        form.setValue(`workOrders.${index}.deliveredProjectItems`, woItem)
      })
    }
  }, [JSON.stringify(woItems), JSON.stringify(workOrderCodes)])

  if (woItems.isLoading) {
    return (
      <div className='relative flex h-[200px] w-full items-center justify-center gap-2'>
        <Icons.spinner className='size-5 animate-spin text-primary' /> <span>Loading Line Items...</span>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-12'>
      <div className='col-span-12'></div>

      <div className='col-span-12 min-h-0 flex-1'>
        <DataGrid
          ref={dataGridRef}
          dataSource={currentWorkOrderLineItems}
          keyExpr='projectItemCode'
          showBorders
          hoverStateEnabled
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          wordWrapEnabled
          columnAutoWidth={false}
          columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
          onRowUpdated={handleOnRowUpdated}
          onEditorPreparing={(e) => {
            if (e.parentType === 'dataRow' && e.dataField === 'delivered' && e.row?.data?.isDelivered) {
              e.editorOptions.disabled = true
            }
          }}
        >
          <Column dataField='projectItem.code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' allowEditing={false} />
          <Column dataField='delivered' dataType='boolean' minWidth={100} caption='Delivered' allowEditing={true} />
          <Column dataField='projectItem.partNumber' dataType='string' caption='Part Number' allowEditing={false} />
          <Column dataField='projectItem.item.FirmName' dataType='string' caption='Manufacturer' allowEditing={false} />
          <Column dataField='projectItem.item.ItemCode' dataType='string' caption='MFG P/N' allowEditing={false} />
          <Column dataField='projectItem.item.ItemName' dataType='string' caption='Description' allowEditing={false} />
          <Column
            dataField='qty'
            dataType='number'
            caption='Quantity'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            allowEditing={false}
          />

          <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
          <SearchPanel visible highlightCaseSensitive={false} />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnFixing enabled />

          <Toolbar>
            <Item location='before' name='searchPanel' cssClass='[&>.dx-toolbar-item-content>.dx-datagrid-search-panel]:ml-0' />

            <Item location='after'>
              <div className='pr-4'>
                <h2 className='text-sm font-bold'>Work Order #{currentWorkOrderCode}</h2>
              </div>
            </Item>

            <Item location='after'>
              <Tooltip
                target='#work-order-previous-button'
                contentRender={() => 'Previous'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />

              <Button
                id='address-previous-button'
                icon='chevronprev'
                stylingMode='contained'
                type='default'
                disabled={workOrderIndex === 0}
                onClick={handlePrevoiusWorkOrder}
              />
            </Item>

            <Item location='after'>
              <Tooltip
                target='#work-order-next-button'
                contentRender={() => 'Next'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />

              <Button
                id='address-next-button'
                icon='chevronnext'
                stylingMode='contained'
                type='default'
                disabled={workOrderIndex === workOrderCodes.length - 1}
                onClick={handleNextWorkOrder}
              />
            </Item>
          </Toolbar>

          <Pager visible allowedPageSizes={DATAGRID_PAGE_SIZES} showInfo displayMode='full' showPageSizeSelector showNavigationButtons />
          <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
        </DataGrid>
      </div>
    </div>
  )
}

export default WorkOrderLineItemsTobeDeliver
