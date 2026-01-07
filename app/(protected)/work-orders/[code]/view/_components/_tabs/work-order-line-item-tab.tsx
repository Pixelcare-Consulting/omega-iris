'use client'

import {
  Column,
  DataGridTypes,
  DataGridRef,
  Button as DataGridButton,
  Editing,
  CustomRule,
  GroupItem,
  TotalItem,
  Summary,
} from 'devextreme-react/data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from 'devextreme-react/toolbar'
import Popup from 'devextreme-react/popup'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import Tooltip from 'devextreme-react/tooltip'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { subtract } from 'mathjs'

import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import AlertDialog from '@/components/alert-dialog'
import { deleteWorkOrderLineItem, getWorkOrderByCode, upsertWorkOrderLineItem } from '@/actions/work-order'
import { cn, safeParseFloat, safeParseInt } from '@/utils'
import { DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import WorkOrderLineItemForm from '../work-order-line-item-form'
import { WorkOrderItemForm } from '@/schema/work-order'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import useUsers from '@/hooks/safe-actions/user'
import WorkOrderLineItemView from '../work-order-line-item-view'

type WorkOrderLineItemTabProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  workOrderItems: ReturnType<typeof useWoItemsByWoCode>
}

type DataSource = Record<string, any> & WorkOrderItemForm

export default function WorkOrderLineItemTab({ workOrder, workOrderItems }: WorkOrderLineItemTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-work-order-item'
  const DATAGRID_UNIQUE_KEY = 'project-order-items'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<DataSource | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const { executeAsync } = useAction(deleteWorkOrderLineItem)
  const upsertWorkOrderLineItemClient = useAction(upsertWorkOrderLineItem)

  const dataGridRef = useRef<DataGridRef | null>(null)

  const projectItems = useProjecItems(workOrder.projectIndividualCode ?? 0)
  const warehouses = useWarehouses()
  const users = useUsers()

  const workOrderStatus = useMemo(() => safeParseInt(workOrder?.status), [JSON.stringify(workOrder)])

  const woItems = useMemo(() => {
    if (workOrderItems.isLoading || workOrderItems.data.length < 1) return []

    return workOrderItems.data
      .filter((woItem) => woItem.projectItem !== null)
      .map((woItem) => {
        const pItem = woItem.projectItem
        const itemMaster = pItem?.item

        if (!pItem || !itemMaster) return null

        const cost = safeParseFloat(pItem?.cost)
        const qty = safeParseFloat(woItem?.qty)
        const availableToOrder = subtract(safeParseFloat(pItem?.totalStock), safeParseFloat(pItem?.stockIn))
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
          warehouseName: warehouse?.name || '',
          warehouseCode: warehouse?.code,
          warehouseDescription: warehouse?.description || '',
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
          item: itemMaster,
        }
      })
      .filter((item) => item !== null)
  }, [JSON.stringify(workOrderItems)])

  const dataGridStore = useDataGridStore([
    'showFilterRow',
    'setShowFilterRow',
    'showHeaderFilter',
    'setShowHeaderFilter',
    'showFilterBuilderPanel',
    'setShowFilterBuilderPanel',
    'showGroupPanel',
    'setShowGroupPanel',
    'enableStateStoring',
    'columnHidingEnabled',
    'setColumnHidingEnabled',
    'showColumnChooser',
    'setShowColumnChooser',
  ])

  const handleAdd = useCallback(() => {
    setRowData(null)
    setIsOpen(true)
  }, [])

  const handleView = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setRowData({ ...data, maxQty: data?.availableToOrder })
      setIsViewMode(true)
    },
    [setRowData, setIsViewMode]
  )

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

  const handleConfirm = useCallback((workOrderCode: number, projectItemCode: number) => {
    if (!workOrderCode || !projectItemCode) return

    setShowConfirmation(false)

    toast.promise(executeAsync({ workOrderCode, projectItemCode }), {
      loading: 'Deleting line item...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete line item!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            workOrderItems.execute({ workOrderCode: workOrder.code })
            handleClose()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }, [])

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsOpen(false)
    setIsViewMode(false)
  }, [])

  const handleOnRowUpdated = useCallback(
    async (e: DataGridTypes.RowUpdatedEvent<any, any>) => {
      const updatedData = e.data
      const workOrderCode = workOrder.code

      const formData = {
        workOrderCode,
        projectItemCode: updatedData.projectItemCode,
        qty: updatedData.qty,
        maxQty: updatedData?.availableToOrder,
        operation: 'update' as const,
      }

      try {
        const response = await upsertWorkOrderLineItemClient.executeAsync(formData)
        const result = response?.data

        if (result?.error) {
          toast.error(result.message)
          return
        }

        toast.success(result?.message)

        if (result?.data && result?.data?.workOrderItem) workOrderItems.execute({ workOrderCode })
      } catch (error) {
        console.error(error)
        toast.error('Something went wrong! Please try again later.')
      }
    },
    [JSON.stringify(workOrderItems), JSON.stringify(workOrder.code)]
  )

  const renderCommonSummaryIItems = () => {
    return (
      <>
        <GroupItem
          column='availableToOrder'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='qty'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />

        <TotalItem column='availableToOrder' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='qty' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
      </>
    )
  }

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (workOrderItems.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [workOrderItems.isLoading, dataGridRef.current])

  return (
    <>
      {!isViewMode ? (
        <div className='flex h-full w-full flex-col'>
          <Toolbar className='mt-5'>
            <CommonPageHeaderToolbarItems
              dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
              dataGridRef={dataGridRef}
              addButton={{
                text: 'Add Line Item',
                onClick: handleAdd,
              }}
            />
          </Toolbar>

          <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
            <CommonDataGrid
              dataGridRef={dataGridRef}
              data={woItems}
              isLoading={workOrderItems.isLoading}
              storageKey={DATAGRID_STORAGE_KEY}
              keyExpr='projectItemCode'
              dataGridStore={dataGridStore}
              callbacks={{ onRowUpdated: handleOnRowUpdated }}
            >
              <Column dataField='projectItemCode' dataType='string' minWidth={100} caption='ID' sortOrder='asc' allowEditing={false} />
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
                allowEditing={false}
              />

              <Column
                dataField='qty'
                dataType='number'
                caption={`Quantity${workOrderStatus >= 4 ? ' (Locked)' : ''}`}
                format={DEFAULT_NUMBER_FORMAT}
                alignment='left'
                allowEditing={workOrderStatus >= 4 ? false : true}
                cssClass={cn(workOrderStatus >= 4 ? '!bg-slate-100' : '')}
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
                <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
                <DataGridButton
                  icon='edit'
                  onClick={handleEdit}
                  cssClass='!text-lg'
                  hint='Edit'
                  visible={workOrderStatus >= 4 ? false : true}
                />
                <DataGridButton
                  icon='trash'
                  onClick={handleDelete}
                  cssClass='!text-lg !text-red-500'
                  hint='Delete'
                  visible={workOrderStatus >= 4 ? false : true}
                />
              </Column>

              <Summary>
                <GroupItem column='partNumber' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
                {renderCommonSummaryIItems()}
              </Summary>

              <Summary>
                <GroupItem column='manufacturer' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
                {renderCommonSummaryIItems()}
              </Summary>

              <Summary>
                <GroupItem
                  column='manufacturerPartNumber'
                  summaryType='count'
                  displayFormat='{0} item'
                  valueFormat={DEFAULT_NUMBER_FORMAT}
                />
                {renderCommonSummaryIItems()}
              </Summary>

              <Editing mode='cell' allowUpdating={true} allowAdding={false} allowDeleting={false} />
            </CommonDataGrid>

            <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)} width={undefined}>
              <WorkOrderLineItemForm
                workOrderCode={workOrder.code}
                projectName={workOrder.projectIndividual.name}
                setIsOpen={setIsOpen}
                onClose={handleClose}
                lineItem={rowData || null}
                users={users}
                projectItems={projectItems}
                warehouses={warehouses}
                workOrderItems={workOrderItems}
              />
            </Popup>

            <AlertDialog
              isOpen={showConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to delete this item with MFG P/N of "${rowData?.manufacturerPartNumber}" and has Id of "${rowData?.projectItemCode}"?`}
              onConfirm={() => handleConfirm(workOrder.code, rowData?.projectItemCode || 0)}
              onCancel={() => setShowConfirmation(false)}
            />
          </PageContentWrapper>
        </div>
      ) : rowData ? (
        <WorkOrderLineItemView data={rowData} onClose={handleClose} />
      ) : null}
    </>
  )
}
