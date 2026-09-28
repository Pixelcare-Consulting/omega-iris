'use client'

import { getUsersByRoleKey } from '@/actions/users'
import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { format, isValid } from 'date-fns'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { Button as DxButton } from 'devextreme-react/button'
import { isEqual } from 'radash'
import Tooltip from 'devextreme-react/tooltip'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import { ProjectIndividualCustomerForm, projectIndividualCustomerFormSchema } from '@/schema/project-individual'
import { updatePiCustomers } from '@/actions/project-individual'
import LoadingButton from '@/components/loading-button'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { useUsersByRoleKey } from '@/hooks/safe-actions/user'
import { NotificationContext } from '@/context/notification'

type ProjectIndividualCustomerTabProps = {
  projectCode: number
  customers: number[]
  users: ReturnType<typeof useUsersByRoleKey>
}
type DataSource = ReturnType<typeof useUsersByRoleKey>['data']

export default function ProjectIndividualCustomerTab({ projectCode, customers, users }: ProjectIndividualCustomerTabProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-customer'
  const DATAGRID_UNIQUE_KEY = 'project-individual-customers'

  // const notificationContext = useContext(NotificationContext)

  const form = useForm({
    mode: 'onChange',
    values: { code: projectCode, customers },
    resolver: zodResolver(projectIndividualCustomerFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updatePiCustomers)

  const selectedRowKeys = useWatch({ control: form.control, name: 'customers' }) || []

  const dataGridRef = useRef<DataGridRef | null>(null)
  const hasClearedStoredFilterRef = useRef(false)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  //* filter the grid down to the selected rows only, filtering (unlike swapping the data source) keeps the selection intact
  const selectedOnlyFilterValue = useMemo(() => {
    if (!showSelectedOnly || selectedRowKeys.length < 1) return null

    const conditions = selectedRowKeys.map((key) => ['code', '=', key])
    if (conditions.length === 1) return conditions[0]

    return conditions.reduce<any[]>((acc, condition) => (acc.length < 1 ? [condition] : [...acc, 'or', condition]), [])
  }, [showSelectedOnly, JSON.stringify(selectedRowKeys)])

  //* nothing selected means there is nothing to narrow down to, so the toggle falls back to showing all rows
  const isShowingSelectedOnly = showSelectedOnly && selectedRowKeys.length > 0

  //* the "show selected only" filter gets persisted by state storing, so drop it once on load to always start showing all rows
  const handleOnContentReady = useCallback((e: DataGridTypes.ContentReadyEvent) => {
    if (hasClearedStoredFilterRef.current) return

    const instance = e.component
    if (!instance) return

    hasClearedStoredFilterRef.current = true

    const restoredFilterValue = instance.option('filterValue')
    if (restoredFilterValue && JSON.stringify(restoredFilterValue).includes('code')) instance.clearFilter('filterValue')
  }, [])

  const lastSigninCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const lastSignin = data?.lastSignin
    if (!lastSignin || !isValid(lastSignin)) return ''
    return format(lastSignin, 'MM-dd-yyyy hh:mm a')
  }, [])

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/users/${data?.code}/view`)
  }, [])

  const handleOnSelectionChange = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const selectedRowKeys = e.selectedRowKeys
    form.setValue('customers', selectedRowKeys)
    if (selectedRowKeys.length > 0) form.clearErrors('customers')
  }, [])

  function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement
    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (data?.deletedAt || data?.deletedBy) {
          if (checkbox) checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy
        }
      }
    }
  }

  const handleSave = (formData: ProjectIndividualCustomerForm) => {
    if (!formData.code) return

    toast.promise(executeAsync(formData), {
      loading: 'Updating customers...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to update customers!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            // notificationContext?.handleRefresh()
          }, 1000)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  //* nothing selected means there is nothing to narrow down to, so fall back to showing all rows
  useEffect(() => {
    if (selectedRowKeys.length < 1 && showSelectedOnly) setShowSelectedOnly(false)
  }, [selectedRowKeys.length, showSelectedOnly])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (users.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [users.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5 px-4'>
        <Item location='before' locateInMenu='auto' widget='dxButton'>
          <Tooltip
            target='#show-selected-only-button'
            contentRender={() => (isShowingSelectedOnly ? 'Show all customers' : 'Show selected customers only')}
            showEvent='mouseenter'
            hideEvent='mouseleave'
            position='top'
          />
          <DxButton
            id='show-selected-only-button'
            icon='selectall'
            text={`${selectedRowKeys.length} selected`}
            type='default'
            stylingMode={isShowingSelectedOnly ? 'contained' : 'outlined'}
            disabled={users.isLoading || selectedRowKeys.length < 1}
            onClick={() => setShowSelectedOnly((prev) => !prev)}
          />
        </Item>

        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#save-button' contentRender={() => 'Save'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <LoadingButton
            id='save-button'
            icon='save'
            isLoading={isExecuting}
            type='default'
            stylingMode='contained'
            disabled={isEqual(customers, selectedRowKeys)}
            onClick={() => form.handleSubmit(handleSave)()}
          />
        </Item>

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      {form?.formState?.errors?.customers && <div className='px-4 text-xs text-red-500'>{form?.formState?.errors?.customers?.message}</div>}

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={users.data}
          isLoading={users.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          filterValue={selectedOnlyFilterValue}
          callbacks={{
            onSelectionChanged: handleOnSelectionChange,
            onCellPrepared: handleOnCellPrepared,
            onContentReady: handleOnContentReady,
          }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='username' dataType='string' />
          <Column
            dataField='fullName'
            dataType='string'
            caption='Full Name'
            calculateCellValue={(rowData) => `${rowData.fname} ${rowData.lname}`}
          />
          <Column dataField='customerCode' dataType='string' caption='Customer Code' />
          <Column dataField='email' dataType='string' caption='Email Address' />
          <Column dataField='role.name' dataType='string' caption='Role' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='location' dataType='string' />
          <Column dataField='lastIpAddress' dataType='string' caption='Last IP Address' />
          <Column dataField='lastSignin' dataType='string' caption='Last Signin' cellRender={lastSigninCellRender} />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={100} fixed fixedPosition='right' caption='Actions'>
            <Button icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
          </Column>
        </CommonDataGrid>
      </div>
    </div>
  )
}
