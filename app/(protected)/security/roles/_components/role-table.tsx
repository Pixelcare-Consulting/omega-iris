'use client'

import { deleleteRole, getRoles } from '@/actions/roles'
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
import { format, isValid } from 'date-fns'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { cn } from '@/utils'
import { createRandomUser } from '@/utils/faker'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES } from '@/constants/devextreme'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'

type RoleTableProps = { roles: Awaited<ReturnType<typeof getRoles>> }
type DataSource = Awaited<ReturnType<typeof getRoles>>

export default function RoleTable({ roles }: RoleTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-role'
  const DATAGRID_UNIQUE_KEY = 'roles'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleleteRole)

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
    router.push(`/security/roles/${code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/security/roles/${code}`)
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
      loading: 'Deleting role...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete role!', unExpectedError: true }

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
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Roles' description='Manage and track your roles effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          addButton={{ text: 'Add Role', onClick: () => router.push('/security/roles/add') }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <DataGrid
          ref={dataGridRef}
          dataSource={roles}
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
        description={`Are you sure you want to delete this role named "${rowData?.name}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  )
}
