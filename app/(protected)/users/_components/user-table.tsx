'use client'

import { deleteUser, getUsers } from '@/actions/users'
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
} from 'devextreme-react/data-grid'
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'

import PageHeader from '../../_components/page-header'
import PageContentWrapper from '../../_components/page-content-wrapper'
import { cn } from '@/utils'
import { createRandomUser } from '@/utils/faker'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES } from '@/constants/devextreme'
import CommonPageHeaderToolbarItems from '../../_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format, isValid } from 'date-fns'

type UserTableProps = { users: Awaited<ReturnType<typeof getUsers>> }
type DataSource = Awaited<ReturnType<typeof getUsers>>

const RANDOM_USERS = Array.from({ length: 100 }).map(() => createRandomUser())

export default function UserTable({ users }: UserTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-user'
  const DATAGRID_UNIQUE_KEY = 'users'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleteUser)

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

  const lastSigninCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const lastSignin = data?.lastSignin
    if (!lastSignin || !isValid(lastSignin)) return ''
    return format(lastSignin, 'MM-dd-yyyy hh:mm a')
  }, [])

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const code = e.data?.code
    if (!code) return
    router.push(`/users/${code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/users/${code}`)
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
      loading: 'Deleting user...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete user!', unExpectedError: true }

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
      <PageHeader title='Users' description='Manage and track your users effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          addButton={{ text: 'Add User', onClick: () => router.push('/users/add') }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <DataGrid
          ref={dataGridRef}
          dataSource={RANDOM_USERS}
          keyExpr='id'
          showBorders
          columnHidingEnabled={dataGridStore.columnHidingEnabled}
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          height='100%'
          onRowClick={handleView}
          onRowPrepared={(e) => e.rowElement.classList.add('cursor-pointer')}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='username' dataType='string' />
          <Column
            dataField='fullName'
            dataType='string'
            caption='Full Name'
            calculateCellValue={(rowData) => `${rowData.fname} ${rowData.lname}`}
          />
          <Column dataField='email' dataType='string' caption='Email Address' />
          <Column dataField='role.name' dataType='string' caption='Role' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            cellRender={statusCellRender}
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='location' dataType='string' />
          <Column dataField='lastIpAddress' dataType='string' caption='Last IP Address' />
          <Column dataField='lastSignin' dataType='string' caption='Last Signin' cellRender={lastSigninCellRender} />

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
          </Column>

          <FilterRow visible={dataGridStore.showFilterRow} />
          <HeaderFilter visible={dataGridStore.showHeaderFilter} allowSearch />
          <FilterPanel visible={dataGridStore.showFilterBuilderPanel} />
          <Grouping contextMenuEnabled={dataGridStore.showGroupPanel} />
          <GroupPanel visible={dataGridStore.showGroupPanel} />
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
        description={`Are you sure you want to delete this user named ${rowData?.fname} ${rowData?.lname}?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  )
}
