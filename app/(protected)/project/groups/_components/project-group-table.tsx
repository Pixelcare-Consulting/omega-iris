'use client'

import { deleletePg, getPgs, importPgs } from '@/actions/project-group'
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
import { useCallback, useRef, useState } from 'react'
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
import { ImportSyncError, Stats } from '@/types/common'

type ProjectGroupTableProps = { projectGroups: Awaited<ReturnType<typeof getPgs>> }
type DataSource = Awaited<ReturnType<typeof getPgs>>

export default function ProjectGroupTable({ projectGroups }: ProjectGroupTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group'
  const DATAGRID_UNIQUE_KEY = 'project-groups'

  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, progress: 0, errors: [], status: 'processing' })

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleletePg)
  const importData = useAction(importPgs)

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
      setShowConfirmation(true)
      setRowData(data)
    },
    [setShowConfirmation, setRowData]
  )

  const handleConfirm = useCallback((code?: number) => {
    if (!code) return

    setShowConfirmation(false)

    toast.promise(executeAsync({ code }), {
      loading: 'Deleting project group...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete project group!', unExpectedError: true }

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
  }, [])

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)

    try {
      const headers: string[] = ['Name', 'Description', 'Active']
      const batchSize = 10

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row }))

      //* trigger write by batch
      let batch: typeof toImportData = []
      let stats: Stats = { total: 0, completed: 0, progress: 0, errors: [], status: 'processing' }

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
            setStats((prev: any) => ({ ...prev, errors: [...prev.errors, ...result.stats.errors] }))
            stats.errors = [...stats.errors, ...result.stats.errors]
          } else if (result?.stats) {
            setStats(result.stats)
            stats = result.stats
          }

          batch = []
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Project groups imported successfully! ${stats.errors.length} errors found.`)
        setStats((prev: any) => ({ ...prev, total: 0, completed: 0, progress: 0, status: 'processing' }))
        router.refresh()
      }

      if (stats.errors.length > 0) {
        setShowImportError(true)
        setImportErrors(stats.errors)
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
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
          addButton={{ text: 'Add Project Group', onClick: () => router.push('/project/groups/add') }}
        />

        {stats && stats.progress && isLoading ? <ProgressBar min={0} max={100} showStatus={false} value={stats.progress} /> : null}
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
            <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' hint='Edit' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' hint='Delete' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this project group named "${rowData?.name}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />

      <ImportSyncErrorDataGrid
        isOpen={showImportError}
        setIsOpen={setShowImportError}
        data={importErrors}
        dataGridRef={importErrorDataGridRef}
      />
    </div>
  )
}
