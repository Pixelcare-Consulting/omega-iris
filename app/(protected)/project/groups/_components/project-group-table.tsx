'use client'

import { deleleteProjectGroup, getProjectGroups, importProjectGroups } from '@/actions/project-group'
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

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import { parseExcelFile } from '@/utils/xlsx'
import ImportErrorDataGrid from '@/components/import-error-datagrid'
import { ImportError } from '@/types/common'

type ProjectGroupTableProps = { projectGroups: Awaited<ReturnType<typeof getProjectGroups>> }
type DataSource = Awaited<ReturnType<typeof getProjectGroups>>

export default function ProjectGroupTable({ projectGroups }: ProjectGroupTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group'
  const DATAGRID_UNIQUE_KEY = 'project-groups'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleleteProjectGroup)
  const importData = useAction(importProjectGroups)

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

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const code = e.data?.code
    if (!code) return
    router.push(`/project/groups/${code}/view`)
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

    try {
      const headers: string[] = ['Name', 'Description', 'Active']

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row }))

      const response = await importData.executeAsync({ data: toImportData })
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)
      router.refresh()

      if (result?.errors && result?.errors.length > 0) {
        setShowImportError(true)
        setImportErrors(result?.errors || [])
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to import file')
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Project Groups' description='Manage and track your project groups effectively' isLoading={importData.isExecuting}>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={importData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{ text: 'Add Project Group', onClick: () => router.push('/project/groups/add') }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={projectGroups}
          storageKey={DATAGRID_STORAGE_KEY}
          callbacks={{ onRowClick: handleView }}
          dataGridStore={dataGridStore}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
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

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
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

      <ImportErrorDataGrid
        isOpen={showImportError}
        setIsOpen={setShowImportError}
        data={importErrors}
        dataGridRef={importErrorDataGridRef}
      />
    </div>
  )
}
