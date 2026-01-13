'use client'

import { deleletePi, getPis, importPis, restorePi } from '@/actions/project-individual'
import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
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
import { ImportSyncError, Stats } from '@/types/common'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import CanView from '@/components/acl/can-view'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'

type ProjectIndividualTableProps = { projectIndividuals: Awaited<ReturnType<typeof getPis>> }
type DataSource = Awaited<ReturnType<typeof getPis>>

export default function ProjectIndividualsTable({ projectIndividuals }: ProjectIndividualTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual'
  const DATAGRID_UNIQUE_KEY = 'project-individuals'

  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, progress: 0, errors: [], status: 'processing' })

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const deleletePiData = useAction(deleletePi)
  const restorePiData = useAction(restorePi)
  const importData = useAction(importPis)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/project/individuals/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/project/individuals/${code}`)
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

  const handleConfirm = useCallback((code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleletePiData.executeAsync({ code }), {
      loading: 'Deleting project individual...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete project individual!', unExpectedError: true }

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

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restorePiData.executeAsync({ code }), {
      loading: 'Restoring project individual...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore project individual!', unExpectedError: true }

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

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)

    try {
      const headers: string[] = ['Name', 'Description', 'Group ID', 'Active']
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
        toast.success(`Project individuals imported successfully! ${stats.errors.length} errors found.`)
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
      setIsLoading(false)
      toast.error(error?.message || 'Failed to import file')
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Project Individuals' description='Manage and track your project individuals effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={isLoading || importData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{
            text: 'Add Project Individual',
            onClick: () => router.push('/project/individuals/add'),
            subjects: 'p-projects-individuals',
            actions: 'create',
          }}
          importOptions={{ subjects: 'p-projects-individuals', actions: 'import' }}
          exportOptions={{ subjects: 'p-projects-individuals', actions: 'export' }}
        />

        {stats && stats.progress && isLoading ? <ProgressBar min={0} max={100} showStatus={false} value={stats.progress} /> : null}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={projectIndividuals} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='code' minWidth={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column dataField='projectGroup.name' dataType='string' caption='Group' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-projects-individuals' action='view'>
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

            <CanView subject='p-projects-individuals' action='edit'>
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

            <CanView subject='p-projects-individuals' action='delete'>
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

            <CanView subject='p-projects-individuals' action='restore'>
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
        description={`Are you sure you want to delete this project individual named "${rowData?.name}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <ImportSyncErrorDataGrid
        isOpen={showImportError}
        setIsOpen={setShowImportError}
        data={importErrors}
        dataGridRef={importErrorDataGridRef}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this project individual named "${rowData?.name}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />
    </div>
  )
}
