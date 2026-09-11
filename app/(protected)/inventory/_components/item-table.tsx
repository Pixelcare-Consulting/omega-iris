'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { saveAs } from 'file-saver-es'
import { Anchor, Workbook } from 'exceljs'
import dxDataGrid from 'devextreme/ui/data_grid'
import { format } from 'date-fns'
import { parseExcelFile } from '@/utils/xlsx'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import { ImportSyncError, Stats, SyncSectionState } from '@/types/common'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'

import {
  deleteItem,
  getItemMasterByPage,
  getItemMasterCount,
  getItems,
  importItems,
  restoreItem,
  syncFromSap,
  syncToSap,
} from '@/actions/item'
import PageHeader from '@/app/(protected)/_components/page-header'
import { Badge } from '@/components/badge'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { exportDataGrid } from 'devextreme/common/export/excel'
import CommonDataGrid from '@/components/common-datagrid'
import ProgressBar from 'devextreme-react/progress-bar'

import { SyncToSapForm, syncToSapFormSchema } from '@/schema/item'
import LoadingButton from '@/components/loading-button'
import { useSyncMeta } from '@/hooks/safe-actions/sync-meta'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { useItemGroups } from '@/hooks/safe-actions/item-group'
import { useManufacturers } from '@/hooks/safe-actions/manufacturer'
import { NotificationContext } from '@/context/notification'
import { chunkArray, safeParseInt } from '@/utils'
import { ITEM_MASTER_MAX_PAGE_SIZE, SYNC_TO_SAP_CHUNK_SIZE } from '@/constants/sap'

type ItemTableProps = { items: Awaited<ReturnType<typeof getItems>> }
type DataSource = Awaited<ReturnType<typeof getItems>>

const INITIAL_STATS: Stats = { total: 0, completed: 0, synced: 0, progress: 0, errors: [], status: 'idle' }

const INITIAL_SYNC_SECTION_STATE: SyncSectionState = {
  stats: INITIAL_STATS,
  errors: [],
  showError: false,
  showConfirmation: false,
}

export default function ItemTable({ items }: ItemTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-inventory'
  const DATAGRID_UNIQUE_KEY = 'inventory'

  // const notificationContext = useContext(NotificationContext)

  const form = useForm({
    mode: 'onChange',
    values: { items: [] },
    resolver: zodResolver(syncToSapFormSchema),
  })

  const itemsToSync = useWatch({ control: form.control, name: 'items' })

  const [isLoading, setIsLoading] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)

  const [importState, setImportState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)
  const [syncToSapState, setSyncToSapState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)
  const [syncFromSapState, setSyncFromSapState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)
  const syncErrorDataGridRef = useRef<DataGridRef | null>(null)
  const syncFromSapErrorDataGridRef = useRef<DataGridRef | null>(null)

  const deleteItemData = useAction(deleteItem)
  const restoreItemData = useAction(restoreItem)
  const importData = useAction(importItems)
  const syncToSapData = useAction(syncToSap)
  const syncFromSapData = useAction(syncFromSap)
  const syncMeta = useSyncMeta('item')

  const lastSyncedLabel = useMemo(() => {
    if (!syncMeta.data?.lastSyncAt) return 'Never synced'
    return `Last synced: ${format(syncMeta.data.lastSyncAt, 'PP, hh:mm a')}`
  }, [syncMeta.data?.lastSyncAt])

  const itemGroups = useItemGroups()
  const manufacturers = useManufacturers()

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const selectedRowKeys = useMemo(() => {
    if (itemsToSync.length < 1) return []
    return itemsToSync.map((wo) => wo.code)
  }, [JSON.stringify(itemsToSync)])

  const importDependenciesIsLoading = useMemo(() => {
    return itemGroups.isLoading || manufacturers.isLoading
  }, [itemGroups.isLoading, manufacturers.isLoading])

  const thumbnailCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const thumbnail = data.thumbnail

    return <img src={thumbnail || '/images/placeholder-img.jpg'} className='size-[60px]' />
  }, [])

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/inventory/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/inventory/${code}`)
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

    toast.promise(deleteItemData.executeAsync({ code }), {
      loading: 'Deleting inventory...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete inventory!', unExpectedError: true }

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

    toast.promise(restoreItemData.executeAsync({ code }), {
      loading: 'Restoring inventory...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore inventory!', unExpectedError: true }

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

    //* excclude selection are row with syncStatus === synced or has deletedAt or deletedBy
    const allowData = e.selectedRowsData.filter((row) => row.syncStatus === 'pending' && !row?.deletedAt && !row?.deletedBy)

    const values = allowData.map((row) => ({
      code: row.code,
      ItemCode: row.ItemCode,
      ItemName: row.ItemName,
      Manufacturer: row?.FirmCode,
      ItemsGroupCode: row?.ItmsGrpCod,
    }))

    if (values.length < 1) instance.deselectAll()

    form.setValue('items', values)
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

  const exportToExcel = (fileName: string, component?: dxDataGrid<any, any> | null, selectedRowsOnly = false) => {
    if (!component) return

    const normalizedFileName = fileName.replace(/[^a-zA-Z0-9-]/g, '-')
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Main sheet')

    exportDataGrid({
      component: component,
      worksheet,
      autoFilterEnabled: true,
      selectedRowsOnly,
      customizeCell: ({ gridCell, excelCell }) => {
        if (gridCell?.rowType === 'data') {
          if (gridCell?.column?.dataField === 'thumbnail') {
            const thumbnailBase64Value = gridCell.value
            excelCell.value = ''

            if (!thumbnailBase64Value || typeof thumbnailBase64Value !== 'string') return

            const image = workbook.addImage({
              base64: gridCell.value,
              extension: 'png',
            })

            worksheet.getRow(excelCell.row).height = 60
            worksheet.getColumn(excelCell.col).width = 15
            worksheet.addImage(image, {
              tl: { col: excelCell.col - 1, row: excelCell.row - 1 } as Anchor,
              br: { col: excelCell.col, row: excelCell.row } as Anchor,
            })
          }
        }
      },
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${normalizedFileName}-${format(new Date(), 'MM-dd-yyyy')}.xlsx`)
      })
    })
  }

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)
    setImportState((prev) => ({ ...prev, stats: { ...INITIAL_STATS, status: 'processing' } }))

    try {
      const headers: string[] = ['MFG_P/N', 'Manufacturer', 'Description', 'Group', 'Notes', 'Active']
      const batchSize = 100

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row }))

      //* trigger write by batch
      let batch: typeof toImportData = []
      let stats: Stats = { total: toImportData.length, completed: 0, synced: 0, progress: 0, errors: [], status: 'processing' }

      for (let i = 0; i < toImportData.length; i++) {
        const isLastRow = i === toImportData.length - 1
        const row = toImportData[i]

        //* add to batch
        batch.push(row)

        //* check if batch size is reached or last row
        if (batch.length === batchSize || isLastRow) {
          const response = await importData.executeAsync({
            data: batch,
            total: toImportData.length,
            stats,
            isLastRow,
            metaData: {
              itemGroups: itemGroups.data,
              manufacturers: manufacturers.data,
            },
          })
          const result = response?.data

          if (result?.error) {
            setImportState((prev) => ({ ...prev, stats: { ...prev.stats, errors: [...prev.stats.errors, ...result.stats.errors] } }))
            stats.errors = [...stats.errors, ...result.stats.errors]
          } else if (result?.stats) {
            setImportState((prev) => ({ ...prev, stats: result.stats }))
            stats = result.stats
          }

          batch = []
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Item master imported successfully!. ${stats.errors.length} errors found.`)
        setImportState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        router.refresh()
        // notificationContext?.handleRefresh()
      }

      if (stats.errors.length > 0) {
        setImportState((prev) => ({ ...prev, showError: true, errors: stats.errors }))
        // notificationContext?.handleRefresh()
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      setIsLoading(false)
      toast.error(error?.message || 'Failed to import file!')
    }
  }

  const handleConfirmSyncToSap = async (formData: SyncToSapForm) => {
    setIsLoading(true)

    try {
      const allItems = formData.items
      const total = allItems.length

      setSyncToSapState((prev) => ({ ...prev, showConfirmation: false, stats: { ...INITIAL_STATS, status: 'processing', total } }))

      const chunks = chunkArray(allItems, SYNC_TO_SAP_CHUNK_SIZE)
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
        toast.success(`Item master synced to SAP successfully!. ${stats.errors.length} errors found.`)
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
      toast.error(error?.message || 'Failed to sync items to SAP!', { duration: 10000 })
    }
  }

  const handleConfirmSyncFromSap = async () => {
    setIsLoading(true)
    setSyncFromSapState((prev) => ({ ...prev, showConfirmation: false, stats: { ...INITIAL_STATS, status: 'processing' } }))

    try {
      //* get total count of item master from sap
      const totalCount = await getItemMasterCount()

      if (totalCount < 1) {
        toast.error('Failed to fetch item master from SAP!')
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        setIsLoading(false)
        return
      }

      const totalPage = Math.ceil(totalCount / ITEM_MASTER_MAX_PAGE_SIZE)

      //* trigger sync by page
      let stats: Stats = { total: totalCount, completed: 0, synced: 0, progress: 0, errors: [], status: 'processing' }

      for (let page = 0; page <= totalPage; page++) {
        const isLastPage = page === totalPage

        //* fetch item master from sap per page
        const pageData = await getItemMasterByPage(page)

        if (pageData.length < 1) {
          if (isLastPage) stats.status = 'completed'
          continue
        }

        const response = await syncFromSapData.executeAsync({
          data: pageData,
          total: totalCount,
          stats,
          isLastRow: isLastPage,
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
        toast.success(`Item master synced from SAP successfully!. ${stats.errors.length} errors found.`)
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        router.refresh()
        syncMeta.execute({ code: 'item' })
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
      toast.error(error?.message || 'Failed to sync items from SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader
        title={
          <>
            <span className='pr-1.5'>Item Master</span>
            <Badge variant={syncMeta.data?.lastSyncAt ? 'soft-green' : 'soft-slate'}>{lastSyncedLabel}</Badge>
          </>
        }
        description='Manage and track your item master effectively'
      >
        {selectedRowKeys.length > 0 && (
          <CanView subject='p-inventory' action='sync to sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              <Tooltip
                target='#sync-items-to-sap'
                contentRender={() => 'Sync To SAP'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />
              <LoadingButton
                id='sync-items-to-sap'
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
        )}

        {selectedRowKeys.length < 1 && (
          <CanView subject='p-inventory' action='sync from sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              {!syncMeta.isLoading && (
                <Tooltip
                  target='#sync-from-sap-to-portal'
                  contentRender={() => lastSyncedLabel}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
              )}
              <LoadingButton
                id='sync-from-sap-to-portal'
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
          isLoading={isLoading || importData.isExecuting || syncToSapData.isExecuting || syncFromSapData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{ text: 'Add Item Master', onClick: () => router.push('/inventory/add'), subjects: 'p-inventory', actions: 'create' }}
          customs={{ exportToExcel }}
          importOptions={{
            subjects: 'p-inventory',
            actions: 'import',
            isLoading: importDependenciesIsLoading,
          }}
          exportOptions={{
            subjects: 'p-inventory',
            actions: 'export',
            isLoading: importDependenciesIsLoading,
          }}
        />

        {isLoading && importState.stats.status === 'processing' ? (
          <ProgressBar min={0} max={100} showStatus={false} value={importState.stats.progress} />
        ) : null}

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
          data={items}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onCellPrepared: handleOnCellPrepared, onSelectionChanged: handleOnSelectionChanged }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='thumbnail' minWidth={140} caption='Thumbnail' cellRender={thumbnailCellRender} />
          <Column dataField='FirmName' dataType='string' caption='Manufacturer' />
          <Column dataField='ItemCode' dataType='string' caption='MFG P/N' />
          <Column dataField='ItemName' dataType='string' caption='Description' />
          <Column dataField='syncStatus' dataType='string' caption='Sync Status' cssClass='capitalize' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='notes' dataType='string' caption='Notes' />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-inventory' action='view'>
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

            <CanView subject='p-inventory' action='edit'>
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

            <CanView subject='p-inventory' action='delete'>
              <DataGridButton
                icon='trash'
                onClick={handleDelete}
                cssClass='!text-lg !text-red-500'
                hint='Delete'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced')
                }}
              />
            </CanView>

            <CanView subject='p-inventory' action='restore'>
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
      </PageContentWrapper>

      <AlertDialog
        isOpen={showDeleteConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this item master named "${rowData?.ItemName}"?`}
        onConfirm={() => handleConfirmDelete(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this item master named "${rowData?.ItemName}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />

      <AlertDialog
        isOpen={syncToSapState.showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to sync this item${itemsToSync.length > 1 ? 's' : ''} to SAP?`}
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
        isOpen={importState.showError}
        setIsOpen={(value) => setImportState((prev) => ({ ...prev, showError: value }))}
        data={importState.errors}
        dataGridRef={importErrorDataGridRef}
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
        <Column dataField='code' dataType='string' caption='MFG P/N' alignment='center' />
        <Column dataField='name' dataType='string' caption='Description' alignment='center' />
      </ImportSyncErrorDataGrid>
    </div>
  )
}
