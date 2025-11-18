'use client'

import { deleleteProjectGroup, getProjectGroups } from '@/actions/project-group'
import DataGrid, {
  Column,
  FilterRow,
  DataGridTypes,
  Pager,
  Paging,
  HeaderFilter,
  Sorting,
  Scrolling,
  ColumnChooser,
  FilterPanel,
  Grouping,
  GroupPanel,
  Export,
  StateStoring,
  DataGridRef,
  Selection,
  Button as DataGridButton,
  ColumnFixing,
} from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES } from '@/constants/devextreme'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { cn } from '@/utils'

type ProjectGroupTableProps = { projectGroups: Awaited<ReturnType<typeof getProjectGroups>> }
type DataSource = Awaited<ReturnType<typeof getProjectGroups>>

export default function ProjectGroupTable({ projectGroups }: ProjectGroupTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group'
  const DATAGRID_UNIQUE_KEY = 'project-groups'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleleteProjectGroup)

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

  const statusCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const isActive = data.isActive

    return (
      <div className={cn('flex items-center gap-1.5', isActive ? 'text-green-500' : 'text-red-500')}>
        <div className={cn('size-2 rounded-full', isActive ? 'bg-green-500' : 'bg-red-500')} />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    )
  }, [])

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

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Project Groups' description='Manage and track your project groups effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          addButton={{ text: 'Add Project Group', onClick: () => router.push('/project/groups/add') }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <DataGrid
          ref={dataGridRef}
          dataSource={projectGroups}
          keyExpr='id'
          showBorders
          columnHidingEnabled={dataGridStore.columnHidingEnabled}
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          height='100%'
          width='100%'
          onRowClick={handleView}
          onRowPrepared={(e) => e.rowElement.classList.add('cursor-pointer')}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            cellRender={statusCellRender}
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
          </Column>

          <FilterRow visible={dataGridStore.showFilterRow} />
          <HeaderFilter visible={dataGridStore.showHeaderFilter} allowSearch />
          <FilterPanel visible={dataGridStore.showFilterBuilderPanel} />
          <Grouping contextMenuEnabled={dataGridStore.showGroupPanel} />
          <GroupPanel visible={dataGridStore.showGroupPanel} />
          <ColumnFixing enabled />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnChooser mode='select' allowSearch width={300} />
          <Export formats={['pdf', 'xlsx']} />
          <Selection mode='multiple' />

          <StateStoring enabled={dataGridStore.enableStateStoring} type='localStorage' storageKey={DATAGRID_STORAGE_KEY} />

          <Pager
            visible={true}
            allowedPageSizes={DATAGRID_PAGE_SIZES}
            showInfo
            displayMode='full'
            showPageSizeSelector
            showNavigationButtons
          />
          <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
        </DataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this project group named "${rowData?.name}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  )
}
