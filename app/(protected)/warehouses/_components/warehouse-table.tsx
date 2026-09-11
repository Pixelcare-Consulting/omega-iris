'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'
import ProgressBar from 'devextreme-react/progress-bar'

import { deleleteWarehouse, getWarehouseMaster, getWarehouses, restoreWarehouse, syncFromSap, syncToSap } from '@/actions/warehouse'
import PageHeader from '@/app/(protected)/_components/page-header'
import { Badge } from '@/components/badge'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import LoadingButton from '@/components/loading-button'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { SYNC_TO_SAP_CHUNK_SIZE } from '@/constants/sap'
import { NotificationContext } from '@/context/notification'
import { useSyncMeta } from '@/hooks/safe-actions/sync-meta'
import { SyncToSapForm, syncToSapFormSchema } from '@/schema/warehouse'
import { Stats, SyncSectionState } from '@/types/common'
import { chunkArray } from '@/utils'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'

type WarehousesTableProps = { warehouses: Awaited<ReturnType<typeof getWarehouses>> }
type DataSource = Awaited<ReturnType<typeof getWarehouses>>

const INITIAL_STATS: Stats = { total: 0, completed: 0, synced: 0, progress: 0, errors: [], status: 'idle' }

const INITIAL_SYNC_SECTION_STATE: SyncSectionState = {
  stats: INITIAL_STATS,
  errors: [],
  showError: false,
  showConfirmation: false,
}

export default function WarehouseTable({ warehouses }: WarehousesTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-warehouses'
  const DATAGRID_UNIQUE_KEY = 'warehouses'

  const notificationContext = useContext(NotificationContext)

  const form = useForm({
    mode: 'onChange',
    values: { warehouses: [] },
    resolver: zodResolver(syncToSapFormSchema),
  })

  const warehousesToSync = useWatch({ control: form.control, name: 'warehouses' })

  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)

  const [syncToSapState, setSyncToSapState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)
  const [syncFromSapState, setSyncFromSapState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const syncErrorDataGridRef = useRef<DataGridRef | null>(null)
  const syncFromSapErrorDataGridRef = useRef<DataGridRef | null>(null)

  const deleteWarehouseData = useAction(deleleteWarehouse)
  const restoreWarehouseData = useAction(restoreWarehouse)
  const syncToSapData = useAction(syncToSap)
  const syncFromSapData = useAction(syncFromSap)
  const syncMeta = useSyncMeta('warehouse')

  const lastSyncedLabel = useMemo(() => {
    if (!syncMeta.data?.lastSyncAt) return 'Never synced'
    return `Last synced: ${format(syncMeta.data.lastSyncAt, 'PP, hh:mm a')}`
  }, [syncMeta.data?.lastSyncAt])

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const selectedRowKeys = useMemo(() => {
    if (warehousesToSync.length < 1) return []
    return warehousesToSync.map((wh) => wh.code)
  }, [JSON.stringify(warehousesToSync)])

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/warehouses/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/warehouses/${code}`)
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

  const handleConfirmDelete = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteWarehouseData.executeAsync({ code }), {
      loading: 'Deleting warehouse...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete warehouse!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            // notificationContext?.handleRefresh()
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

    toast.promise(restoreWarehouseData.executeAsync({ code }), {
      loading: 'Restoring warehouse...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore warehouse!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            // notificationContext?.handleRefresh()
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

  const handleOnSelectionChanged = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const instance = e.component

    //* exclude from selection rows with syncStatus === synced or has deletedAt or deletedBy
    const allowData = e.selectedRowsData.filter((row) => row.syncStatus === 'pending' && !row?.deletedAt && !row?.deletedBy)

    const values = allowData.map((row) => ({
      code: row.code,
      WarehouseCode: row.WarehouseCode,
      WarehouseName: row.WarehouseName,
      Nettable: row?.Nettable,
      EnableBinLocations: row?.EnableBinLocations,
      Street: row?.Street,
      Address2: row?.Address2,
      Address3: row?.Address3,
      StreetNo: row?.StreetNo,
      BuildingFloorRoom: row?.BuildingFloorRoom,
      Block: row?.Block,
      City: row?.City,
      ZipCode: row?.ZipCode,
      County: row?.County,
      CountryCode: row?.CountryCode,
      CountryName: row?.CountryName,
      StateCode: row?.StateCode,
      StateName: row?.StateName,
      GlobalLocationNumber: row?.GlobalLocationNumber,
    }))

    if (values.length < 1) instance.deselectAll()

    form.setValue('warehouses', values)
  }, [])

  function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement

    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      const isBlocked = data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced'

      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (isBlocked && checkbox) {
          checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy
        }
      }
    }
  }

  const handleConfirmSyncToSap = async (formData: SyncToSapForm) => {
    setIsLoading(true)

    try {
      const allWarehouses = formData.warehouses
      const total = allWarehouses.length

      setSyncToSapState((prev) => ({ ...prev, showConfirmation: false, stats: { ...INITIAL_STATS, status: 'processing', total } }))

      const chunks = chunkArray(allWarehouses, SYNC_TO_SAP_CHUNK_SIZE)
      let stats: Stats = { total, completed: 0, synced: 0, progress: 0, errors: [], status: 'processing' }

      for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1

        const response = await syncToSapData.executeAsync({
          data: chunks[i],
          total,
          stats,
          isLastRow: isLastChunk,
        })
        const result = response?.data

        if (result?.error) {
          setSyncToSapState((prev) => ({ ...prev, stats: { ...prev.stats, errors: [...prev.stats.errors, ...result.stats.errors] } }))
          stats.errors = [...stats.errors, ...result.stats.errors]
        } else if (result?.stats) {
          setSyncToSapState((prev) => ({ ...prev, stats: result.stats }))
          stats = result.stats
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Warehouses synced to SAP successfully!. ${stats.errors.length} errors found.`)
        setSyncToSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        form.reset()
        router.refresh()
        // notificationContext?.handleRefresh()
      }

      if (stats.errors.length > 0) {
        setSyncToSapState((prev) => ({ ...prev, showError: true, errors: stats.errors }))
        // notificationContext?.handleRefresh()
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      setIsLoading(false)
      toast.error(error?.message || 'Failed to sync warehouses to SAP!', { duration: 10000 })
    }
  }

  const handleConfirmSyncFromSap = async () => {
    setIsLoading(true)
    setSyncFromSapState((prev) => ({ ...prev, showConfirmation: false, stats: { ...INITIAL_STATS, status: 'processing' } }))

    try {
      //* fetch the whole warehouse master from sap, it is small enough to be fetched in a single call
      const warehouseMaster = await getWarehouseMaster()
      const totalCount = warehouseMaster.length

      if (totalCount < 1) {
        toast.error('Failed to fetch warehouse master from SAP!')
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        setIsLoading(false)
        return
      }

      const chunks = chunkArray(warehouseMaster, SYNC_TO_SAP_CHUNK_SIZE)

      //* trigger sync by chunk
      let stats: Stats = { total: totalCount, completed: 0, synced: 0, progress: 0, errors: [], status: 'processing' }

      for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1

        const response = await syncFromSapData.executeAsync({
          data: chunks[i],
          total: totalCount,
          stats,
          isLastRow: isLastChunk,
        })
        const result = response?.data

        if (result?.error) {
          setSyncFromSapState((prev) => ({ ...prev, stats: { ...prev.stats, errors: [...prev.stats.errors, ...result.stats.errors] } }))
          stats.errors = [...stats.errors, ...result.stats.errors]
        } else if (result?.stats) {
          setSyncFromSapState((prev) => ({ ...prev, stats: result.stats }))
          stats = result.stats
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Warehouse master synced from SAP successfully!. ${stats.errors.length} errors found.`)
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        router.refresh()
        syncMeta.execute({ code: 'warehouse' })
        // notificationContext?.handleRefresh()
      }

      if (stats.errors.length > 0) {
        setSyncFromSapState((prev) => ({ ...prev, showError: true, errors: stats.errors }))
        // notificationContext?.handleRefresh()
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      setIsLoading(false)
      toast.error(error?.message || 'Failed to sync warehouses from SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader
        title={
          <>
            <span className='pr-1.5'>Warehouses</span>
            <Badge variant={syncMeta.data?.lastSyncAt ? 'soft-green' : 'soft-slate'}>{lastSyncedLabel}</Badge>
          </>
        }
        description='Manage and track your warehouses effectively'
      >
        {/* {selectedRowKeys.length > 0 && (
          <CanView subject='p-warehouses' action='sync to sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              <Tooltip
                target='#sync-warehouses-to-sap'
                contentRender={() => 'Sync To SAP'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />
              <LoadingButton
                id='sync-warehouses-to-sap'
                icon='upload'
                isLoading={syncToSapData.isExecuting || syncToSapState.stats.status === 'processing'}
                text={`${selectedRowKeys.length} : Sync To SAP`}
                type='default'
                loadingText='Syncing'
                stylingMode='outlined'
                onClick={() => setSyncToSapState((prev) => ({ ...prev, showConfirmation: true }))}
              />
            </Item>
          </CanView>
        )} */}

        {selectedRowKeys.length < 1 && (
          <CanView subject='p-warehouses' action='sync from sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              {!syncMeta.isLoading && (
                <Tooltip
                  target='#sync-warehouses-from-sap'
                  contentRender={() => lastSyncedLabel}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
              )}
              <LoadingButton
                id='sync-warehouses-from-sap'
                icon='refresh'
                isLoading={syncFromSapData.isExecuting || syncFromSapState.stats.status === 'processing'}
                type='default'
                text='Sync From SAP'
                loadingText={syncMeta.isLoading ? 'Depedecy loading' : 'Syncing'}
                stylingMode='outlined'
                onClick={() => setSyncFromSapState((prev) => ({ ...prev, showConfirmation: true }))}
              />
            </Item>
          </CanView>
        )}

        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={isLoading || syncToSapData.isExecuting || syncFromSapData.isExecuting}
          // addButton={{ text: 'Add Warehouse', onClick: () => router.push('/warehouses/add'), subjects: 'p-warehouses', actions: 'create' }}
          exportOptions={{ subjects: 'p-warehouses', actions: 'export' }}
        />

        {isLoading && syncToSapState.stats.status === 'processing' ? (
          <ProgressBar min={0} max={100} showStatus={false} value={syncToSapState.stats.progress} />
        ) : null}

        {isLoading && syncFromSapState.stats.status === 'processing' ? (
          <ProgressBar min={0} max={100} showStatus={false} value={syncFromSapState.stats.progress} />
        ) : null}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={warehouses}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          dataGridStore={dataGridStore}
          // isSelectionEnable
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onCellPrepared: handleOnCellPrepared, onSelectionChanged: handleOnSelectionChanged }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='WarehouseCode' dataType='string' caption='Code' />
          <Column dataField='WarehouseName' dataType='string' caption='Name' />
          <Column dataField='syncStatus' dataType='string' caption='Sync Status' cssClass='capitalize' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column
            dataField='Nettable'
            dataType='string'
            caption='Nettable'
            calculateCellValue={(rowData) => (rowData.Nettable ? 'Yes' : 'No')}
          />
          <Column
            dataField='EnableBinLocations'
            dataType='string'
            caption='Enable Bin Location'
            calculateCellValue={(rowData) => (rowData.EnableBinLocations ? 'Yes' : 'No')}
          />

          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-warehouses' action={['view', 'view (owner)']}>
              <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
            </CanView>

            {/* <CanView subject='p-warehouses' action='edit'>
              <DataGridButton
                icon='edit'
                onClick={handleEdit}
                cssClass='!text-lg'
                hint='Edit'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced')
                }}
              />
            </CanView>

            <CanView subject='p-warehouses' action='delete'>
              <DataGridButton
                icon='trash'
                onClick={handleDelete}
                cssClass='!text-lg !text-red-500'
                hint='Delete'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced' || data.key === 'admin')
                }}
              />
            </CanView>

            <CanView subject='p-warehouses' action='restore'>
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
            </CanView> */}
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showDeleteConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this warehouse named "${rowData?.WarehouseName}"?`}
        onConfirm={() => handleConfirmDelete(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this warehouse item named  "${rowData?.WarehouseName}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />

      <AlertDialog
        isOpen={syncToSapState.showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to sync this warehouse${warehousesToSync.length > 1 ? 's' : ''} and its bin locations to SAP?`}
        onConfirm={() => handleConfirmSyncToSap(form.getValues())}
        onCancel={() => setSyncToSapState((prev) => ({ ...prev, showConfirmation: false }))}
      />

      <AlertDialog
        isOpen={syncFromSapState.showConfirmation}
        title='Are you sure?'
        description='Are you sure you want to sync from SAP?'
        onConfirm={() => handleConfirmSyncFromSap()}
        onCancel={() => setSyncFromSapState((prev) => ({ ...prev, showConfirmation: false }))}
      />

      <ImportSyncErrorDataGrid
        title='Sync To SAP Error'
        description='There was an error encountered while syncing.'
        isOpen={syncToSapState.showError}
        setIsOpen={(value) => setSyncToSapState((prev) => ({ ...prev, showError: value }))}
        data={syncToSapState.errors}
        dataGridRef={syncErrorDataGridRef}
      >
        <Column dataField='code' dataType='string' caption='Id' alignment='center' />
      </ImportSyncErrorDataGrid>

      <ImportSyncErrorDataGrid
        title='Sync From SAP Error'
        description='There was an error encountered while syncing.'
        isOpen={syncFromSapState.showError}
        setIsOpen={(value) => setSyncFromSapState((prev) => ({ ...prev, showError: value }))}
        data={syncFromSapState.errors}
        dataGridRef={syncFromSapErrorDataGridRef}
      >
        <Column dataField='code' dataType='string' caption='Code' alignment='center' />
        <Column dataField='name' dataType='string' caption='Name' alignment='center' />
      </ImportSyncErrorDataGrid>
    </div>
  )
}
