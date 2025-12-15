'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DataGrid, {
  Column,
  DataGridRef,
  Editing,
  Item,
  LoadPanel,
  Pager,
  Paging,
  Scrolling,
  SearchPanel,
  Sorting,
  Toolbar,
  Button as DataGridButton,
  DataGridTypes,
  ColumnFixing,
} from 'devextreme-react/data-grid'
import Button from 'devextreme-react/button'
import Tooltip from 'devextreme-react/tooltip'
import Popup from 'devextreme-react/popup'

import { useFormContext, useWatch } from 'react-hook-form'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { WorkOrderForm, WorkOrderItemForm } from '@/schema/work-order'
import WorkOrderLineItemForm from './work-order-line-item-form'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import useUsers from '@/hooks/safe-actions/user'
import { toast } from 'sonner'
import AlertDialog from '@/components/alert-dialog'
import { getWorkOrderByCode } from '@/actions/work-order'
import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import FormMessage from '@/components/forms/form-message'
import { safeParseFloat } from '@/utils'

type WorkOrderLineItemsFormProps = {
  workOrder: Awaited<ReturnType<typeof getWorkOrderByCode>>
  workOrderItems: ReturnType<typeof useWoItemsByWoCode>
  projectCode?: number
  projectName?: string
  isLoading?: boolean
}

export default function WorkOrderLineItemTable({
  workOrder,
  workOrderItems,
  projectCode,
  projectName,
  isLoading,
}: WorkOrderLineItemsFormProps) {
  const dataGridRef = useRef<DataGridRef | null>(null)

  const form = useFormContext<WorkOrderForm>()

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<(Record<string, any> & WorkOrderItemForm) | null>(null)
  const [workOrderItemsDataSource, setWorkOrderItemsDataSource] = useState<Record<string, any>[]>([])

  const lineItems = useWatch({ control: form.control, name: 'lineItems' }) || []

  const projectItems = useProjecItems(projectCode ?? 0)
  const warehouses = useWarehouses()
  const users = useUsers()

  const handleAdd = useCallback(() => {
    setRowData(null)
    setIsOpen(true)
  }, [])

  const handleEdit = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setIsOpen(true)
      setRowData(data)
    },
    [setIsOpen, setRowData]
  )

  const handleDelete = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowConfirmation(true)
      setRowData(data)
    },
    [setShowConfirmation, setRowData]
  )

  const handleConfirm = useCallback(() => {
    if (!rowData || !rowData?.projectItemCode) return

    setShowConfirmation(false)

    const currentLineItems = [...lineItems]
    const index = currentLineItems.findIndex((li) => li.projectItemCode === rowData?.projectItemCode)

    if (index !== -1) {
      currentLineItems.splice(index, 1)

      form.setValue('lineItems', currentLineItems)
      if (currentLineItems.length === 0) setWorkOrderItemsDataSource([])

      handleClose()
    } else {
      toast.error('Failed to delete the line item!')
    }
  }, [JSON.stringify(lineItems), JSON.stringify(rowData)])

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsOpen(false)
  }, [])

  const handleOnRowUpdated = useCallback(
    (e: DataGridTypes.RowUpdatedEvent<any, any>) => {
      const index = e.key
      const updatedRows = [...workOrderItemsDataSource]
      const rowIndex = updatedRows.findIndex((x) => x.projectItemCode === index)

      if (rowIndex !== -1) {
        updatedRows[rowIndex] = e.data //* update rows
        const updatedLineItems = updatedRows.map(({ projectItemCode, qty }) => ({ projectItemCode, qty }))

        form.setValue('lineItems', updatedLineItems) //* update line items
        setWorkOrderItemsDataSource(updatedRows) //* update local datasource state
      }
    },
    [JSON.stringify(workOrderItemsDataSource)]
  )

  //* set local state work order items data source when work order data exist
  useEffect(() => {
    if (workOrder && workOrderItems.data.length > 0) {
      const lineItemValue = workOrderItems.data
        .filter((woItem) => woItem.projectItem !== null)
        .map((woItem) => {
          const pItem = woItem.projectItem
          const itemMaster = pItem.item

          if (!pItem || !itemMaster) return null

          const qty = safeParseFloat(woItem.qty)

          return { projectItemCode: pItem?.code, qty }
        })
        .filter((item) => item !== null)

      setTimeout(() => {
        form.setValue('lineItems', lineItemValue)
      }, 500)
    }
  }, [JSON.stringify(workOrder), JSON.stringify(workOrderItems)])

  //* set local state work order items data source when line items has been updated
  useEffect(() => {
    if (lineItems.length > 0 && !projectItems.isLoading && projectItems.data.length > 0) {
      const woItems = lineItems
        .map((li) => {
          const pItem = projectItems.data.find((pi) => pi.code === li.projectItemCode)
          const itemMaster = pItem?.item

          if (!pItem || !itemMaster) return null

          const cost = safeParseFloat(pItem?.cost)
          const qty = safeParseFloat(li?.qty)
          const availableToOrder = safeParseFloat(pItem?.availableToOrder)
          const inProcess = safeParseFloat(pItem?.inProcess)
          const totalStock = safeParseFloat(pItem?.totalStock)

          const warehouse = pItem?.warehouse
          const dateReceivedBy = pItem?.dateReceivedByUser ? `${pItem.dateReceivedByUser.fname}${pItem.dateReceivedByUser.lname ? ` ${pItem.dateReceivedByUser.lname}` : ''}` : '' // prettier-ignore

          return {
            projectItemCode: pItem?.code,
            manufacturerPartNumber: itemMaster?.manufacturerPartNumber || '',
            manufacturer: itemMaster?.manufacturer || '',
            partNumber: pItem?.partNumber || '',
            description: itemMaster?.description || '',
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
            inProcess,
            totalStock,
            cost,
            qty,
          }
        })
        .filter((item) => item !== null)

      setWorkOrderItemsDataSource(woItems)
    }
  }, [JSON.stringify(lineItems), JSON.stringify(projectItems), JSON.stringify(workOrderItems)])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (isLoading || workOrderItems.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [isLoading, dataGridRef.current, JSON.stringify(workOrderItems)])

  return (
    <>
      <Separator className='col-span-12' />

      <div className='col-span-12 mb-1'>
        <ReadOnlyFieldHeader className='mb-1' title='Line Items' description="Work order's line item details" />
        {form.formState.errors.lineItems?.message && (
          <div className='col-span-12'>
            <FormMessage>{form.formState.errors.lineItems?.message}</FormMessage>
          </div>
        )}
      </div>

      <div className='col-span-12'>
        {/* //TODO: add feature to select row/s to be a part of the line items for the work order creation.  */}
        {/* //TODO: In the work order automatically put those selected item, based from the projectItemCodes passed from the query e.g projectItemCodes=1,2,3,4 */}
        <DataGrid
          ref={dataGridRef}
          dataSource={workOrderItemsDataSource}
          keyExpr='projectItemCode'
          showBorders
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          wordWrapEnabled
          columnAutoWidth={false}
          columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
          onRowUpdated={handleOnRowUpdated}
        >
          <Column dataField='projectItemCode' dataType='string' minWidth={100} caption='ID' sortOrder='asc' allowEditing={false} />
          <Column dataField='partNumber' dataType='string' caption='Part Number' allowEditing={false} />
          <Column dataField='manufacturer' dataType='string' caption='Manufacturer' allowEditing={false} />
          <Column dataField='manufacturerPartNumber' dataType='string' caption='MFG P/N' allowEditing={false} />
          <Column dataField='description' dataType='string' caption='Description' allowEditing={false} />
          <Column
            dataField='totalStock'
            dataType='number'
            caption='Total Stock'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            allowEditing={false}
          />
          <Column dataField='qty' dataType='number' caption='Quantity' format={DEFAULT_NUMBER_FORMAT} alignment='left' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' hint='Edit' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' hint='Delete' />
          </Column>

          <LoadPanel enabled={isLoading || workOrderItems.isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />
          <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
          <SearchPanel visible highlightCaseSensitive={false} />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnFixing enabled />

          <Toolbar>
            <Item location='after' widget='dxButton'>
              <Tooltip
                target='#add-button'
                contentRender={() => 'Add Line Item'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />
              <Button id='add-button' icon='add' type='default' stylingMode='contained' onClick={handleAdd} disabled={!projectCode} />
            </Item>

            <Item cssClass='[&_.dx-datagrid-search-panel]:!ml-0' name='searchPanel' location='after' />
          </Toolbar>

          <Pager visible allowedPageSizes={DATAGRID_PAGE_SIZES} showInfo displayMode='full' showPageSizeSelector showNavigationButtons />
          <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
        </DataGrid>

        <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)} width={undefined}>
          <WorkOrderLineItemForm
            projectName={projectName}
            setIsOpen={setIsOpen}
            onClose={handleClose}
            lineItem={rowData || null}
            users={users}
            projectItems={projectItems}
            warehouses={warehouses}
          />
        </Popup>

        <AlertDialog
          isOpen={showConfirmation}
          title='Are you sure?'
          description={`Are you sure you want to delete this item with MFG P/N of "${rowData?.manufacturerPartNumber}" and has Id of "${rowData?.projectItemCode}"?`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(false)}
        />
      </div>
    </>
  )
}
