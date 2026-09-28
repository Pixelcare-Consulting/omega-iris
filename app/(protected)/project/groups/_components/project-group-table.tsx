'use client'

import { deleletePg, getPgs, importPgs, restorePg } from '@/actions/project-group'
import DataGrid, {
  Column,
  DataGridTypes,
  DataGridRef,
  Button as DataGridButton,
  MasterDetail,
  Export,
  Toolbar,
  Item,
  Pager,
  Paging,
} from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import ProgressBar from 'devextreme-react/progress-bar'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import { parseExcelFile } from '@/utils/xlsx'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import { ImportSyncError, Stats, SyncSectionState } from '@/types/common'
import CanView from '@/components/acl/can-view'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { NotificationContext } from '@/context/notification'

type ProjectGroupTableProps = { projectGroups: Awaited<ReturnType<typeof getPgs>> }
type DataSource = Awaited<ReturnType<typeof getPgs>>

const INITIAL_STATS: Stats = { total: 0, completed: 0, synced: 0, progress: 0, errors: [], status: 'idle' }

const INITIAL_SYNC_SECTION_STATE: SyncSectionState = {
  stats: INITIAL_STATS,
  errors: [],
  showError: false,
  showConfirmation: false,
}

export default function ProjectGroupTable({ projectGroups }: ProjectGroupTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group'
  const DATAGRID_UNIQUE_KEY = 'project-groups'

  // const notificationContext = useContext(NotificationContext)

  const [isLoading, setIsLoading] = useState(false)
  const [importState, setImportState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const deleletePgData = useAction(deleletePg)
  const restorePgData = useAction(restorePg)
  const importData = useAction(importPgs)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/project/groups/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/project/groups/${code}`)
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

  const handleConfirmDelete = useCallback((code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleletePgData.executeAsync({ code }), {
      loading: 'Deleting project group...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete project group!', unExpectedError: true }

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
  }, [])

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restorePgData.executeAsync({ code }), {
      loading: 'Restoring project group...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore project group!', unExpectedError: true }

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

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)
    setImportState((prev) => ({ ...prev, stats: { ...INITIAL_STATS, status: 'processing' } }))

    try {
      const headers: string[] = ['Name', 'Description', 'Active']
      const batchSize = 10

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row, Name: row?.['Name']?.trim() }))

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
          const response = await importData.executeAsync({ data: batch, total: toImportData.length, stats, isLastRow })
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
        toast.success(`Project groups imported successfully! ${stats.errors.length} errors found.`)
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
      toast.error(error?.message || 'Failed to import file')
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Project Groups' description='Manage and track your project groups effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={isLoading || importData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{
            text: 'Add Project Group',
            onClick: () => router.push('/project/groups/add'),
            subjects: 'p-projects-groups',
            actions: 'create',
          }}
          importOptions={{ subjects: 'p-projects-groups', actions: 'import' }}
          exportOptions={{ subjects: 'p-projects-groups', actions: 'export' }}
        />

        {isLoading && importState.stats.status === 'processing' ? (
          <ProgressBar min={0} max={100} showStatus={false} value={importState.stats.progress} />
        ) : null}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={projectGroups} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' fixed fixedPosition='right' minWidth={140} caption='Actions'>
            <CanView subject='p-projects-groups' action={['view', 'view (owner)']}>
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

            <CanView subject='p-projects-groups' action='edit'>
              <DataGridButton
                icon='edit'
                onClick={handleEdit}
                cssClass='!text-lg'
                hint='Edit'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>

            <CanView subject='p-projects-groups' action='delete'>
              <DataGridButton
                icon='trash'
                onClick={handleDelete}
                cssClass='!text-lg !text-red-500'
                hint='Delete'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>

            <CanView subject='p-projects-groups' action='restore'>
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
        description={`Are you sure you want to delete this project group named "${rowData?.name}"?`}
        onConfirm={() => handleConfirmDelete(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <ImportSyncErrorDataGrid
        isOpen={importState.showError}
        setIsOpen={(value) => setImportState((prev) => ({ ...prev, showError: value }))}
        data={importState.errors}
        dataGridRef={importErrorDataGridRef}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this project group named "${rowData?.name}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />
    </div>
  )
}
