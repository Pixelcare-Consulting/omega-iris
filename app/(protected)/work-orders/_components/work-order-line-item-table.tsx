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
} from 'devextreme-react/data-grid'
import Button from 'devextreme-react/button'
import Tooltip from 'devextreme-react/tooltip'
import Popup from 'devextreme-react/popup'

import { useFormContext, useWatch } from 'react-hook-form'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
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
  const [rowData, setRowData] = useState<WorkOrderItemForm | null>(null)

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

  const handleConfirm = useCallback(
    (projectItemCode?: number) => {
      if (!projectItemCode) return

      setShowConfirmation(false)

      const currentLineItems = [...lineItems]
      const index = currentLineItems.findIndex((li) => li.projectItemCode === projectItemCode)

      if (index !== -1) {
        currentLineItems.splice(index, 1)
        form.setValue('lineItems', currentLineItems)
        handleClose()
      } else {
        toast.error('Failed to delete the line item!')
      }
    },
    [JSON.stringify(lineItems)]
  )

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsOpen(false)
  }, [])

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
        <DataGrid
          ref={dataGridRef}
          dataSource={lineItems}
          keyExpr='projectItemCode'
          showBorders
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          width='100%'
          height='100%'
          onRowPrepared={handleOnRowPrepared}
          wordWrapEnabled
        >
          <Column dataField='partNumber' dataType='string' caption='Part Number' sortOrder='asc' />
          <Column dataField='projectItemManufacturer' dataType='string' caption='Manufacturer' />
          <Column dataField='projectItemMpn' dataType='string' caption='MFG P/N' />
          <Column dataField='projectItemDescription' dataType='string' caption='Description' />
          <Column dataField='qty' dataType='number' caption='Quantity' format={DEFAULT_NUMBER_FORMAT} alignment='left' />

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
          </Column>

          <LoadPanel enabled={isLoading || workOrderItems.isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />
          <Editing mode='cell' allowUpdating={false} allowAdding={false} allowDeleting={false} />
          <SearchPanel visible highlightCaseSensitive={false} />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />

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
            projectCode={projectCode}
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
          description={`Are you sure you want to delete this item named "${rowData?.projectItemDescription}"?`}
          onConfirm={() => handleConfirm(rowData?.projectItemCode)}
          onCancel={() => setShowConfirmation(false)}
        />
      </div>
    </>
  )
}
