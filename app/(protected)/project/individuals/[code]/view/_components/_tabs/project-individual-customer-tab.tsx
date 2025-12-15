'use client'

import { getUsersByRoleKey } from '@/actions/users'
import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { format, isValid } from 'date-fns'
import Toolbar, { Item } from 'devextreme-react/toolbar'
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

type ProjectIndividualCustomerTabProps = {
  projectCode: number
  customers: number[]
  users: { data: Awaited<ReturnType<typeof getUsersByRoleKey>>; isLoading?: boolean }
}
type DataSource = Awaited<ReturnType<typeof getUsersByRoleKey>>

export default function ProjectIndividualCustomerTab({ projectCode, customers, users }: ProjectIndividualCustomerTabProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-customer'
  const DATAGRID_UNIQUE_KEY = 'project-individual-customers'

  const form = useForm({
    mode: 'onChange',
    values: { code: projectCode, customers },
    resolver: zodResolver(projectIndividualCustomerFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updatePiCustomers)

  const selectedRowKeys = useWatch({ control: form.control, name: 'customers' }) || []

  const dataGridRef = useRef<DataGridRef | null>(null)

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

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (users.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [users.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#save-button' contentRender={() => 'Save'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <LoadingButton
            id='save-button'
            icon='save'
            text={
              isEqual(customers, selectedRowKeys) ? undefined : selectedRowKeys.length > 0 ? `${selectedRowKeys.length} selected` : 'Clear'
            }
            isLoading={isExecuting}
            type='default'
            stylingMode='contained'
            disabled={isEqual(customers, selectedRowKeys)}
            onClick={() => form.handleSubmit(handleSave)()}
          />
        </Item>

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      {form.formState.errors.customers && <div className='px-4 text-xs text-red-500'>{form.formState.errors.customers.message}</div>}

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={users.data}
          isLoading={users.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onSelectionChanged: handleOnSelectionChange }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
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
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='location' dataType='string' />
          <Column dataField='lastIpAddress' dataType='string' caption='Last IP Address' />
          <Column dataField='lastSignin' dataType='string' caption='Last Signin' cellRender={lastSigninCellRender} />

          <Column type='buttons' minWidth={100} fixed fixedPosition='right' caption='Actions'>
            <Button icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>
    </div>
  )
}
