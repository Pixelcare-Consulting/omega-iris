'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'
import Popup from 'devextreme-react/popup'

import { deleteWorkOrder, getWorkOrders, restoreWorkOrder } from '@/actions/work-order'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import { WORK_ORDER_STATUS_OPTIONS, workOrderStatusUpdateFormSchema } from '@/schema/work-order'
import LoadingButton from '@/components/loading-button'
import WorkOrderUpdateStatusForm from './work-order-update-status-form'
import CanView from '@/components/acl/can-view'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { safeParseInt } from '@/utils'

type WorkOrderTableProps = { workOrders: Awaited<ReturnType<typeof getWorkOrders>> }
type DataSource = Awaited<ReturnType<typeof getWorkOrders>>

export default function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-work-order'
  const DATAGRID_UNIQUE_KEY = 'work-orders'

  const form = useForm({
    mode: 'onChange',
    values: {
      workOrders: [],
      currentStatus: '',
      comments: '',
      trackingNum: '',
    },
    resolver: zodResolver(workOrderStatusUpdateFormSchema),
  })

  const currentStatus = useWatch({ control: form.control, name: 'currentStatus' })

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [showUpdateStatusForm, setShowUpdateStatusForm] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)

  const dataGridRef = useRef<DataGridRef | null>(null)

  const deleteWorkOrderData = useAction(deleteWorkOrder)
  const restoreWorkOrderData = useAction(restoreWorkOrder)

  const workOrderToUpdate = useWatch({ control: form.control, name: 'workOrders' }) || []

  const selectedRowKeys = useMemo(() => {
    if (workOrderToUpdate.length < 1) return []
    return workOrderToUpdate.map((wo) => wo.code)
  }, [JSON.stringify(workOrderToUpdate)])

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return

    router.push(`/work-orders/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/work-orders/${code}`)
  }, [])

  const handleDelete = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowDeleteConfirmation(true)
      setRowData(data)
    },
    [setShowDeleteConfirmation, setRowData]
  )

  const handleRestore = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowRestoreConfirmation(true)
      setRowData(data)
    },
    [setShowRestoreConfirmation, setRowData]
  )

  const handleConfirm = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteWorkOrderData.executeAsync({ code }), {
      loading: 'Deleting work orders...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete work orders!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restoreWorkOrderData.executeAsync({ code }), {
      loading: 'Restoring work order...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore work order!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  const handleOnSelectionChanged = useCallback(
    (e: DataGridTypes.SelectionChangedEvent) => {
      const instance = e.component

      //* exclude selection are row with status >= 6 or has deletedAt or deletedBy
      const allowData = e.selectedRowsData.filter((row) => safeParseInt(row?.status) < 6 && !row?.deletedAt && !row?.deletedBy)

      const values = allowData.map((workOrder) => ({
        code: workOrder.code,
        prevStatus: workOrder.status,
        deliveredProjectItems: [],
      }))

      if (values.length < 1) instance.deselectAll()

      form.setValue('workOrders', values)
    },
    [JSON.stringify(workOrderToUpdate)]
  )

  function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement

    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      const isBlocked = data?.deletedAt || data?.deletedBy || safeParseInt(data?.status) >= 6

      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (isBlocked && checkbox) {
          checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy
        }
      }
    }
  }

  const handleCloseUpdateStatusForm = useCallback(() => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
    setShowUpdateStatusForm(false)

    //* deselect all rows
    if (dataGridRef.current) {
      const intance = dataGridRef.current.instance()
      intance.deselectAll()
    }
  }, [dataGridRef.current])

  return (
    <div className='h-full w-full space-y-5'>
      <FormProvider {...form}>
        <PageHeader title='Work Orders' description='Manage and track your work order effectively'>
          {selectedRowKeys.length > 0 && (
            <CanView subject='p-work-orders' action='update status'>
              <Item location='after' locateInMenu='auto' widget='dxButton'>
                <Tooltip
                  target='#update-status'
                  contentRender={() => 'Update Status'}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
                <LoadingButton
                  id='update-status'
                  icon='rename'
                  isLoading={deleteWorkOrderData.isExecuting || restoreWorkOrderData.isExecuting}
                  text={`${selectedRowKeys.length} : Update Status`}
                  type='default'
                  stylingMode='outlined'
                  onClick={() => setShowUpdateStatusForm(true)}
                />
              </Item>
            </CanView>
          )}

          <CommonPageHeaderToolbarItems
            dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
            dataGridRef={dataGridRef}
            isEnableImport
            addButton={{
              text: 'Add Work Order',
              onClick: () => router.push('/work-orders/add'),
              subjects: 'p-work-orders',
              actions: 'create',
            }}
          />
        </PageHeader>

        <PageContentWrapper className='h-[calc(100%_-_92px)]'>
          <CommonDataGrid
            dataGridRef={dataGridRef}
            data={workOrders}
            storageKey={DATAGRID_STORAGE_KEY}
            keyExpr='code'
            isSelectionEnable
            dataGridStore={dataGridStore}
            selectedRowKeys={selectedRowKeys}
            callbacks={{
              onCellPrepared: handleOnCellPrepared,
              onRowClick: handleView,
              onSelectionChanged: handleOnSelectionChanged,
            }}
          >
            <Column dataField='code' dataType='string' minWidth={100} caption='ID' />
            <Column dataField='projectIndividual.name' dataType='string' caption='Project' />
            <Column dataField='projectIndividual.projectGroup.name' dataType='string' caption='Project Group' />
            <Column
              dataField='status'
              dataType='string'
              caption='Status'
              calculateCellValue={(data) => WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === data.status)?.label}
            />
            <Column
              dataField='isInternal'
              dataType='string'
              caption='Internal'
              calculateCellValue={(data) => (data?.isInternal ? 'Yes' : 'No')}
            />
            <Column
              dataField='owner'
              dataType='string'
              caption='Owner'
              calculateCellValue={(rowData) => `${rowData?.user?.fname} ${rowData?.user?.lname}`}
            />
            <Column dataField='user.email' dataType='string' caption='Owner Email' />

            <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
              <CanView subject='p-work-orders' action={['view', 'view (owner)']}>
                <DataGridButton
                  icon='eyeopen'
                  onClick={handleView}
                  cssClass='!text-lg'
                  hint='View'
                  visible={(opt) => {
                    const data = opt?.row?.data
                    return hideActionButton(data?.deletedAt || data?.deletedBy)
                  }}
                />
              </CanView>

              <CanView subject='p-work-orders' action='edit'>
                <DataGridButton
                  icon='edit'
                  onClick={handleEdit}
                  cssClass='!text-lg'
                  hint='Edit'
                  visible={(opt) => {
                    const data = opt?.row?.data
                    const status = safeParseInt(data?.status)
                    return hideActionButton(data?.deletedAt || data?.deletedBy || status >= 6)
                  }}
                />
              </CanView>

              <CanView subject='p-work-orders' action='delete'>
                <DataGridButton
                  icon='trash'
                  onClick={handleDelete}
                  cssClass='!text-lg !text-red-500'
                  hint='Delete'
                  visible={(opt) => {
                    const data = opt?.row?.data
                    const status = safeParseInt(data?.status)
                    return hideActionButton(data?.deletedAt || data?.deletedBy || status >= 6)
                  }}
                />
              </CanView>

              <CanView subject='p-work-orders' action='restore'>
                <DataGridButton
                  icon='undo'
                  onClick={handleRestore}
                  cssClass='!text-lg !text-blue-500'
                  hint='Restore'
                  visible={(opt) => {
                    const data = opt?.row?.data
                    return showActionButton(data?.deletedAt || data?.deletedBy)
                  }}
                />
              </CanView>
            </Column>
          </CommonDataGrid>

          <Popup
            visible={showUpdateStatusForm}
            dragEnabled={false}
            showTitle={false}
            onHiding={() => setShowUpdateStatusForm(false)}
            width={undefined}
            maxWidth={1200}
            height={currentStatus !== '5' ? 410 : 750}
          >
            <WorkOrderUpdateStatusForm selectedRowKeys={selectedRowKeys} onClose={handleCloseUpdateStatusForm} />
          </Popup>

          <AlertDialog
            isOpen={showDeleteConfirmation}
            title='Are you sure?'
            description={`Are you sure you want to delete this work order with id "${rowData?.code}"?`}
            onConfirm={() => handleConfirm(rowData?.code)}
            onCancel={() => setShowDeleteConfirmation(false)}
          />

          <AlertDialog
            isOpen={showRestoreConfirmation}
            title='Are you sure?'
            description={`Are you sure you want to restore this work order with id "${rowData?.code}"?`}
            onConfirm={() => handleConfirmRestore(rowData?.code)}
            onCancel={() => setShowRestoreConfirmation(false)}
          />
        </PageContentWrapper>
      </FormProvider>
    </div>
  )
}
