'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from 'devextreme-react/toolbar'
import Popup from 'devextreme-react/popup'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'

import { useWoItemsByWoCode } from '@/hooks/safe-actions/work-order-item'
import AlertDialog from '@/components/alert-dialog'
import { deleteWorkOrderLineItem, getWorkOrderByCode } from '@/actions/work-order'
import { safeParseFloat } from '@/utils'
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

type DataSource = WorkOrderItemForm

export default function WorkOrderLineItemTab({ workOrder, workOrderItems }: WorkOrderLineItemTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-work-order-item'
  const DATAGRID_UNIQUE_KEY = 'project-order-items'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<DataSource | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const { executeAsync } = useAction(deleteWorkOrderLineItem)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const projectItems = useProjecItems(workOrder.projectIndividualCode ?? 0)
  const warehouses = useWarehouses()
  const users = useUsers()

  const woItems = useMemo(() => {
    if (workOrderItems.isLoading || workOrderItems.data.length < 1) return []

    return workOrderItems.data
      .filter((woItem) => woItem.projectItem !== null)
      .map((woItem) => {
        const pItem = woItem.projectItem

        const cost = safeParseFloat(woItem.cost)
        const qty = safeParseFloat(woItem.qty)

        return {
          projectItemCode: pItem.code,
          warehouseCode: woItem.warehouseCode,
          partNumber: woItem?.partNumber ?? '',
          dateCode: woItem?.dateCode ?? null,
          countryOfOrigin: woItem?.countryOfOrigin ?? null,
          lotCode: woItem?.lotCode ?? null,
          palletNo: woItem?.palletNo ?? null,
          dateReceived: woItem?.dateReceived ?? null,
          dateReceivedBy: woItem?.dateReceivedBy ?? null,
          packagingType: woItem?.packagingType ?? null,
          spq: woItem?.spq ?? null,
          cost,
          qty,

          //* set temporary fields
          projectName: pItem?.projectIndividual?.name ?? null,
          projectItemManufacturer: pItem?.item?.manufacturer ?? null,
          projectItemMpn: pItem?.item?.manufacturerPartNumber ?? null,
          projectItemDescription: pItem?.item?.description ?? null,
        }
      })
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

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const data = e.data
    if (!data) return
    setRowData(e.data)
    setIsViewMode(true)
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
              callbacks={{ onRowClick: handleView }}
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
            </CommonDataGrid>

            <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)} width={undefined}>
              <WorkOrderLineItemForm
                workOrderCode={workOrder.code}
                projectCode={workOrder.projectIndividualCode}
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
              description={`Are you sure you want to delete this item named "${rowData?.projectItemDescription}"?`}
              onConfirm={() => handleConfirm(workOrder.code, rowData?.projectItemCode || 0)}
              onCancel={() => setShowConfirmation(false)}
            />
          </PageContentWrapper>
        </div>
      ) : rowData ? (
        <WorkOrderLineItemView workOrderCode={workOrder.code} data={rowData} onClose={handleClose} />
      ) : null}
    </>
  )
}
