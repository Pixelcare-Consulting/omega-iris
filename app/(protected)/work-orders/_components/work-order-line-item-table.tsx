'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CustomRule,
  GroupItem,
  TotalItem,
  Summary,
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
import { cn, safeParseFloat, safeParseInt } from '@/utils'
import { subtract } from 'mathjs'
import { FormDebug } from '@/components/forms/form-debug'
import { Icons } from '@/components/icons'
import { parseExcelFile } from '@/utils/xlsx'
import { ImportSyncError, ImportSyncErrorEntry } from '@/types/common'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const form = useFormContext<WorkOrderForm>()

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])
  const [rowData, setRowData] = useState<(Record<string, any> & WorkOrderItemForm) | null>(null)
  const [workOrderItemsDataSource, setWorkOrderItemsDataSource] = useState<Record<string, any>[]>([])

  const lineItems = useWatch({ control: form.control, name: 'lineItems' }) || []

  const projectItems = useProjecItems(projectCode ?? 0)
  const warehouses = useWarehouses()
  const users = useUsers()

  const workOrderStatus = useMemo(() => safeParseInt(workOrder?.status), [JSON.stringify(workOrder)])

  const handleAdd = useCallback(() => {
    setRowData(null)
    setIsOpen(true)
  }, [])

  const handleEdit = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setIsOpen(true)
      setRowData({ ...data, maxQty: data?.availableToOrder })
    },
    [setIsOpen, setRowData]
  )

  const handleDelete = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowConfirmation(true)
      setRowData({ ...data, maxQty: data?.availableToOrder })
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
        const updatedLineItems = updatedRows.map(({ projectItemCode, qty, availableToOrder, isDelivered }) => ({
          projectItemCode,
          qty,
          maxQty: availableToOrder,
          isDelivered,
        }))

        form.setValue('lineItems', updatedLineItems) //* update line items
        setWorkOrderItemsDataSource(updatedRows) //* update local datasource state
      }
    },
    [JSON.stringify(workOrderItemsDataSource)]
  )

  const handleImport = async (file: File) => {
    setIsImporting(true)
    setImportErrors([])

    const fileInput = fileInputRef?.current as any

    try {
      //* batching will not be implemented
      const headers: string[] = ['ID', 'Quantity']

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row })) as Record<string, any>[]

      const toBeCreatedLineItems: WorkOrderItemForm[] = []
      const importSyncErrors: ImportSyncError[] = []

      //* process import
      for (let i = 0; i < toImportData.length; i++) {
        const errors: ImportSyncErrorEntry[] = []
        const row = toImportData[i]
        const rowNumber = i + 1
        const pItem = projectItems.data.find((pi) => pi.code == row?.['ID'])

        //* check required fields
        if (!row?.['ID']) errors.push({ field: 'ID', message: 'Missing required field' })

        if (!row?.['Quantity']) errors.push({ field: 'Quantity', message: 'Missing required field' })

        //* check if project item exists
        if (!pItem) errors.push({ field: 'ID', message: 'Item does not exist' })

        //* check if item is already selected
        if (toBeCreatedLineItems.find((li) => li.projectItemCode == row?.['ID'])) {
          errors.push({ field: 'ID', message: 'Item already selected' })
        }

        //* check if item is out of stock
        if (!pItem?.totalStock) errors.push({ field: 'ID', message: 'Item is out of stock' })

        //* check if quantity is a number
        if (!row?.['Quantity'].match(/^[1-9]\d*$/)) errors.push({ field: 'Quantity', message: 'Invalid quantity' })

        //* check if quantity exceed the available to order, and item should not be out of stock
        if (pItem?.totalStock && pItem?.totalStock > 0 && pItem?.availableToOrder && row?.['Quantity'] > pItem?.availableToOrder) {
          errors.push({ field: 'Quantity', message: 'Quantity exceeds the available to order' })
        }

        //* if errors array is not empty continue
        if (errors.length > 0) {
          console.log({ errors })
          importSyncErrors.push({ rowNumber, entries: errors, row, code: row?.code })
          continue
        }

        //* reshape data
        const toCreate: WorkOrderItemForm = {
          projectItemCode: safeParseInt(row?.['ID']),
          qty: safeParseInt(row?.['Quantity']),
          maxQty: safeParseInt(pItem?.availableToOrder),
          isDelivered: false,
        }

        //* add to be created line items
        toBeCreatedLineItems.push(toCreate)
      }

      //* commit import
      form.setValue('lineItems', toBeCreatedLineItems)

      if (importSyncErrors.length > 0) {
        setShowImportError(true)
        setImportErrors(importSyncErrors)
      }

      setIsImporting(false)
      if (fileInput) fileInput.value = ''
    } catch (error: any) {
      console.error(error)

      setIsImporting(false)
      if (fileInput) fileInput.value = ''

      toast.error(error?.message || 'Failed to import file!')
    }
  }

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      //* importing only support xlsx file, only 1 file at a time
      const file = e.target.files?.[0]

      //* check if file exist, if not throw error
      if (!file) {
        toast.error('File not found!')
        return
      }

      //* check if file is xlsx or xls, if not throw error;
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Only .xlsx or .xls file is supported!')
        return
      }

      //* process import
      await handleImport(file)
    },
    [JSON.stringify(projectItems)]
  )

  //* set line items when work order data exist
  useEffect(() => {
    if (workOrder && workOrderItems.data.length > 0) {
      const lineItemValue = workOrderItems.data
        .filter((woItem) => woItem.projectItem !== null)
        .map((woItem) => {
          const pItem = woItem.projectItem
          const itemMaster = pItem.item

          if (!pItem || !itemMaster) return null

          const qty = safeParseFloat(woItem.qty)
          const availableToOrder = subtract(safeParseFloat(pItem?.totalStock), safeParseFloat(pItem?.stockIn))

          return { projectItemCode: pItem?.code, qty, maxQty: availableToOrder, isDelivered: woItem.isDelivered }
        })
        .filter((item) => item !== null)

      setTimeout(() => {
        form.setValue('lineItems', lineItemValue)
      }, 500)
    } else form.setValue('lineItems', [])
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
          const stockIn = safeParseFloat(pItem?.stockIn)
          const stockOut = safeParseFloat(pItem?.stockOut)
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
            stockIn,
            stockOut,
            totalStock,
            cost,
            qty,
            isDelivered: li?.isDelivered,
          }
        })
        .filter((item) => item !== null)

      setWorkOrderItemsDataSource(woItems)
    } else setWorkOrderItemsDataSource([])
  }, [JSON.stringify(lineItems), JSON.stringify(projectItems), JSON.stringify(workOrderItems)])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (isImporting) {
        dataGridRef.current.instance().beginCustomLoading('Importing...')
        return
      }

      if (isLoading || workOrderItems.isLoading || projectItems.isLoading) {
        dataGridRef.current.instance().beginCustomLoading('Loading data...')
      } else dataGridRef.current.instance().endCustomLoading()
    }
  }, [isLoading, dataGridRef.current, JSON.stringify(workOrderItems), JSON.stringify(projectItems), isImporting])

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

      {/* <FormDebug form={form} keys={['lineItems']} /> */}

      <div className='col-span-12'>
        <DataGrid
          ref={dataGridRef}
          dataSource={workOrderItemsDataSource}
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
        >
          <Column dataField='projectItemCode' dataType='string' minWidth={100} caption='ID' sortOrder='asc' allowEditing={false} />
          <Column
            dataField='isDelivered'
            dataType='string'
            minWidth={120}
            caption='Delivered'
            calculateCellValue={(rowData) => (rowData?.isDelivered ? 'Yes' : 'No')}
            cellRender={(cell) => (cell?.data?.isDelivered ? 'Yes' : 'No')}
            allowEditing={false}
            alignment='left'
          />
          <Column dataField='partNumber' dataType='string' caption='Part Number' allowEditing={false} />
          <Column dataField='manufacturer' dataType='string' caption='Manufacturer' allowEditing={false} />
          <Column dataField='manufacturerPartNumber' dataType='string' caption='MFG P/N' allowEditing={false} />
          <Column dataField='description' dataType='string' caption='Description' allowEditing={false} />
          <Column
            dataField='availableToOrder'
            dataType='number'
            caption='Available To Order'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
          />
          <Column
            dataField='qty'
            dataType='number'
            caption={`Quantity${workOrderStatus >= 1 ? ' (Locked)' : ''}`}
            format={DEFAULT_NUMBER_FORMAT}
            alignment='left'
            allowEditing={workOrderStatus >= 1 ? false : true}
            cssClass={cn(workOrderStatus >= 1 ? '!bg-slate-100' : '')}
          >
            <CustomRule
              validationCallback={(e) => {
                const data = e?.data
                return data?.qty >= 1 && data?.qty <= data?.availableToOrder
              }}
              message='Quantity must be greater than 1 and less than or equal to the available to order'
            />
          </Column>

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <DataGridButton
              icon='edit'
              onClick={handleEdit}
              cssClass='!text-lg'
              hint='Edit'
              visible={workOrderStatus >= 1 ? false : true}
            />
            <DataGridButton
              icon='trash'
              onClick={handleDelete}
              cssClass='!text-lg !text-red-500'
              hint='Delete'
              visible={workOrderStatus >= 1 ? false : true}
            />
          </Column>

          <Summary>
            <TotalItem column='availableToOrder' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
            <TotalItem column='qty' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
          </Summary>

          <LoadPanel
            enabled={isLoading || workOrderItems.isLoading || projectItems.isLoading || isImporting}
            shadingColor='rgb(241, 245, 249)'
            showIndicator
            showPane
            shading
          />
          <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
          <SearchPanel visible highlightCaseSensitive={false} />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnFixing enabled />

          <Toolbar>
            <Item location='before' name='searchPanel' cssClass='[&>.dx-toolbar-item-content>.dx-datagrid-search-panel]:ml-0' />

            <Item location='after' widget='dxButton'>
              <Tooltip
                target='#add-button'
                contentRender={() => 'Add Line Item'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />
              <Button
                id='add-button'
                icon='add'
                type='default'
                stylingMode='contained'
                onClick={handleAdd}
                disabled={!projectCode || workOrderStatus >= 1 ? true : false}
              />
            </Item>

            <Item location='after' widget='dxButton'>
              <Tooltip
                target='#import-line-items'
                contentRender={() => 'Import'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />

              <Button
                id='import-line-items'
                icon='import'
                disabled={
                  !projectCode || workOrderStatus >= 1
                    ? true
                    : false || isLoading || workOrderItems.isLoading || projectItems.isLoading || isImporting
                }
                onClick={() => fileInputRef.current?.click()}
              />
            </Item>

            <Item location='after' render={() => <input type='file' className='hidden' ref={fileInputRef} onChange={handleFileUpload} />} />
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

        <ImportSyncErrorDataGrid
          isOpen={showImportError}
          setIsOpen={setShowImportError}
          data={importErrors}
          dataGridRef={importErrorDataGridRef}
        />

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
