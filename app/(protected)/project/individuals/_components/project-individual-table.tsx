'use client'

import { deleletePi, getPis, importPis } from '@/actions/project-individual'
import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
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
import { ImportError } from '@/types/common'
import ImportErrorDataGrid from '@/components/import-error-datagrid'

type ProjectIndividualTableProps = { projectIndividuals: Awaited<ReturnType<typeof getPis>> }
type DataSource = Awaited<ReturnType<typeof getPis>>

export default function ProjectIndividualsTable({ projectIndividuals }: ProjectIndividualTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual'
  const DATAGRID_UNIQUE_KEY = 'project-individuals'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleletePi)
  const importData = useAction(importPis)

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
    router.push(`/project/individuals/${code}/view`)
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
      setShowConfirmation(true)
      setRowData(data)
    },
    [setShowConfirmation, setRowData]
  )

  const handleConfirm = useCallback((code?: number) => {
    if (!code) return

    setShowConfirmation(false)

    toast.promise(executeAsync({ code }), {
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

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    try {
      const headers: string[] = ['Name', 'Description', 'Group ID', 'Active']

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
      <PageHeader
        title='Project Individuals'
        description='Manage and track your project individuals effectively'
        isLoading={importData.isExecuting}
      >
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={importData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{ text: 'Add Project Individual', onClick: () => router.push('/project/individuals/add') }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={projectIndividuals}
          storageKey={DATAGRID_STORAGE_KEY}
          callbacks={{ onRowClick: handleView }}
          dataGridStore={dataGridStore}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
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

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this project individual named "${rowData?.name}"?`}
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
