'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { CheckBox } from 'devextreme-react/check-box'
import TabPanel, { Item as TabPanelItem } from 'devextreme-react/tab-panel'
import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type RoleForm, roleFormSchema } from '@/schema/role'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getRolesByCode, upsertRole } from '@/actions/roles'
import { PageMetadata } from '@/types/common'
import TextAreaField from '@/components/forms/text-area-field'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { usePermissions } from '@/hooks/safe-actions/permission'
import { useRolePermissions } from '@/hooks/safe-actions/role-permission'
import { Icons } from '@/components/icons'
import { titleCase } from '@/utils'
import CanView from '@/components/acl/can-view'
import can from '@/components/acl/can'
import { NotificationContext } from '@/context/notification'
import { useRoleReports } from '@/hooks/safe-actions/role-report'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { useReports } from '@/hooks/safe-actions/report'
import CommonPageHeaderToolbarItems from '../../_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { REPORT_TYPE_LABEL } from '@/schema/report'
import { hideActionButton } from '@/utils/devextreme'

type RoleFormProps = { pageMetaData: PageMetadata; role: Awaited<ReturnType<typeof getRolesByCode>> }

export default function RoleForm({ pageMetaData, role }: RoleFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  // const notificationContext = useContext(NotificationContext)

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-role-report'
  const DATAGRID_UNIQUE_KEY = 'role-reports'
  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const isCreate = code === 'add' || !role
  const isReportingDisabled = process.env.NEXT_PUBLIC_DISABLE_REPORTING === 'true'

  const permissions = usePermissions()
  const rolePermissions = useRolePermissions(role?.id ?? '')
  const reports = useReports()
  const roleReports = useRoleReports(role?.code)

  const permissionsWithChildren = useMemo(() => {
    if (permissions.isLoading || permissions.data.length < 1) return []

    return permissions.data
      .filter((p) => p.isParent || !p.parentId)
      .map((p) => {
        if (p.isParent) {
          return { ...p, children: permissions.data.filter((c) => c.parentId === p.id).sort((a, b) => a.name.localeCompare(b.name)) }
        }
        return { ...p, children: [] }
      })
  }, [JSON.stringify(permissions)])

  const form = useForm<RoleForm>({
    mode: 'onChange',
    resolver: zodResolver(roleFormSchema),
  })

  const name = useWatch({ control: form.control, name: 'name' }) || ''
  const permissionsFormData = useWatch({ control: form.control, name: 'permissions' }) || []
  const roles = useWatch({ control: form.control, name: 'roles' }) || []

  const selectedRowKeys = useMemo(() => {
    if (roles.length < 1) return []
    return roles
  }, [JSON.stringify(roles)])

  const { executeAsync, isExecuting } = useAction(upsertRole)

  const handleOnSubmit = async (formData: RoleForm) => {
    if (formData.key === 'admin') {
      toast.success('Role updated successfully!')
      return
    }

    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) form.setError('key', { type: 'custom', message: result.message })
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.role && 'id' in result?.data?.role) {
        router.refresh()
        // notificationContext?.handleRefresh()
        rolePermissions.execute({ roleId: result.data.role.id })

        setTimeout(() => {
          if (isCreate) router.push(`/roles`)
          else router.push(`/roles/${result.data.role.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const isActionSelected = useCallback(
    (id: string, action: string) => {
      if (!permissionsFormData || permissionsFormData.length === 0) return false

      const index = permissionsFormData.findIndex((p) => p.id === id)
      if (index === -1) return false

      const currentActions = permissionsFormData?.[index]?.actions || []
      return currentActions.includes(action)
    },
    [JSON.stringify(permissionsFormData)]
  )

  const isSelectedAll = useMemo(() => {
    const pdata = permissions.data.filter((p) => !p.isParent)

    if (!permissionsFormData || permissionsFormData.length === 0) return false

    return pdata.every((currP) => {
      const allowedActions = currP?.allowedActions || []
      const permission = permissionsFormData.find((p) => p.id === currP.id)
      const currActions = permission?.actions || []

      if (!permission) return false
      if (!currActions || currActions.length === 0) return false
      return allowedActions.every((a) => currActions.includes(a))
    })
  }, [JSON.stringify(permissionsFormData), JSON.stringify(permissions)])

  const isEmpty = useMemo(() => {
    if (!permissionsFormData || permissionsFormData.length === 0) return true

    return permissionsFormData.every((currP) => {
      const currActions = currP?.actions || []

      if (!currActions || currActions.length === 0) return true
      return currActions.length === 0
    })
  }, [JSON.stringify(permissionsFormData)])

  const toggleAction = (id: string, action: string) => {
    const currPermissions = permissionsFormData || []

    if (!currPermissions || currPermissions.length === 0) {
      form.setValue('permissions', [{ id, actions: [action] }])
      return
    }

    const index = currPermissions.findIndex((p) => p.id === id)

    if (index === -1) {
      currPermissions.push({ id, actions: [action] })
    } else {
      const currentActions = currPermissions?.[index]?.actions || []
      const actionIndex = currentActions.indexOf(action)

      if (actionIndex !== -1) currentActions.splice(actionIndex, 1)
      else currentActions.push(action)

      currPermissions[index].actions = currentActions
    }

    form.setValue('permissions', [...currPermissions])
  }

  const toggleSelectAll = () => {
    const pdata = permissions.data.filter((p) => !p.isParent)

    //* do select all
    if (isSelectedAll) {
      const newPermissions = pdata.map((p) => ({ ...p, actions: [] }))
      form.setValue('permissions', newPermissions)
      return
    }

    //* select all
    const newPermissions = pdata.map((currP) => {
      const allowedActions = currP.allowedActions || []
      return { ...currP, actions: allowedActions }
    })
    form.setValue('permissions', newPermissions)
  }

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data || !data?.code) return
    router.push(`/reports/${data?.code}/view`)
  }, [])

  const handleOnSelectionChange = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    //* exclude selection are row with isDefault === true
    const allowData = e.selectedRowsData.filter((row) => !row.isDefault)

    const values = allowData.map((row) => row.code)

    form.setValue('roles', values)
    if (values.length > 0) form.clearErrors('roles')
  }, [])

  function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement

    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      const isBlocked = data?.deletedAt || data?.deletedBy || data.isDefault

      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (isBlocked && checkbox) {
          checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy or isDefault
        }
      }
    }
  }

  //* update role key based on name
  useEffect(() => {
    const result = name ? name.toLowerCase().replaceAll(' ', '-') : ''
    form.setValue('key', result)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  //* set permissions & roles
  useEffect(() => {
    if (!role) {
      const pData = permissions.data.filter((p) => !p.isParent)

      const permissionsInitialValues = pData.map((p) => ({ id: p.id, actions: [] }))

      const roleObj = {
        code: -1,
        key: '',
        name: '',
        description: null,
        permissions: permissionsInitialValues,
        roles: [],
      }

      form.reset(roleObj)
      return
    }

    let rps: { id: string; actions: string[] }[] = []
    let rrs: number[] = []

    const pdata = permissions.data.filter((p) => !p.isParent)

    if (role && !rolePermissions.isLoading && rolePermissions.data.length > 0) {
      rps = rolePermissions.data.map((rp) => ({ id: rp.permissionId, actions: rp.actions }))
    } else rps = pdata.map((p) => ({ id: p.id, actions: [] }))

    if (role && !roleReports.isLoading && roleReports.data.length > 0) {
      rrs = roleReports.data.map((rp) => rp.reportCode)
    } else rrs = []

    if (role.key === 'admin') {
      rps = pdata.map((p) => ({ id: p.id, actions: p.allowedActions }))
      rrs = reports.data.map((r) => r.code)
    }

    const roleObj = { ...role, permissions: rps, roles: rrs }

    form.reset(roleObj)
  }, [
    isCreate,
    JSON.stringify(role),
    JSON.stringify(permissions),
    JSON.stringify(rolePermissions),
    JSON.stringify(reports),
    JSON.stringify(roleReports),
  ])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (reports.isLoading || roleReports.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [reports.isLoading, roleReports.isLoading, dataGridRef.current])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/roles')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={CanView({ isReturnBoolean: true, subject: 'p-roles', action: !role ? ['create'] : ['edit'] }) ? false : true}
            />
          </Item>

          {role && (
            <>
              <CanView subject='p-users' action='create'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/roles/add`) }}
                />
              </CanView>

              <CanView subject='p-users' action='view'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/roles/${role.code}/view`) }}
                />
              </CanView>
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView useNative>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='name' label='Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TextBoxField
                  control={form.control}
                  name='key'
                  label='Key'
                  isRequired
                  description='Key must be unique'
                  extendedProps={{ textBoxOptions: { disabled: true } }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='description' label='Description' />
              </div>

              <Separator className='col-span-12' />

              <div className='col-span-12'>
                <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
                  <TabPanelItem title='Permissions'>
                    <div className='grid h-full grid-cols-12 gap-5 pt-5'>
                      <ReadOnlyFieldHeader
                        className='col-span-12 mb-1'
                        title='Permissions'
                        description='Set the permissions for this role'
                      />

                      <div className='col-span-12 flex flex-col justify-center gap-4'>
                        <div className='flex w-full items-center justify-between border-b pb-4'>
                          <h2 className='flex items-center gap-1 text-sm font-bold'>
                            <Icons.shieldCheck className='size-4 shrink-0' /> Full Access
                          </h2>

                          <div className='flex items-center gap-2 text-sm'>
                            <CheckBox
                              key='role-permission-select-all'
                              text='Select All'
                              value={isSelectedAll ? true : isEmpty ? false : null}
                              onValueChanged={(e) => {
                                if (!e.event) return
                                toggleSelectAll()
                              }}
                            />
                          </div>
                        </div>

                        <div className='col-span-12 grid grid-cols-12 divide-y'>
                          {permissions.isLoading && (
                            <div className='relative col-span-12 flex h-[240px] w-full items-center justify-center gap-2'>
                              <Icons.spinner className='size-5 animate-spin text-primary' /> <span>Loading permissions...</span>
                            </div>
                          )}

                          {!permissions.isLoading &&
                            permissionsWithChildren.length > 0 &&
                            permissionsWithChildren.map((p) => {
                              if (p.isParent) {
                                return (
                                  <div key={p.id} className='text-s col-span-12 grid grid-cols-12 py-2 pl-2'>
                                    <div className='col-span-12 mb-2.5'>
                                      <h1 className='text-sm font-semibold'>{p.name}</h1>
                                    </div>

                                    <div className='col-span-12 flex flex-col divide-y'>
                                      {p.children.map((pChild) => (
                                        <div
                                          key={`${p.id}-${pChild.id}`}
                                          className='col-span-12 grid grid-cols-12 p-2 hover:bg-slate-400/10'
                                        >
                                          <div className='col-span-4 flex flex-col justify-center'>
                                            <h2 className='text-sm font-semibold'>{pChild.name}</h2>
                                            <p className='-mt-0.5 text-xs text-slate-400'>{pChild.description}</p>
                                          </div>

                                          <div className='col-span-8 grid grid-cols-4 items-center gap-4'>
                                            {pChild.allowedActions.map((action, i) => (
                                              <CheckBox
                                                className='text-xs capitalize'
                                                key={`${p.id}-${pChild.id}-${i}`}
                                                text={action}
                                                value={isActionSelected(pChild.id, action)}
                                                onValueChanged={() => toggleAction(pChild.id, action)}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }

                              return (
                                <div key={p.id} className='text-s b col-span-12 grid grid-cols-12 p-2 hover:bg-slate-400/10'>
                                  <div className='col-span-4 flex flex-col justify-center'>
                                    <h2 className='text-sm font-semibold'>{p.name}</h2>
                                    <p className='-mt-0.5 text-xs text-slate-400'>{p.description}</p>
                                  </div>

                                  <div className='col-span-8 grid grid-cols-6 items-center gap-4'>
                                    {p.allowedActions.map((action, i) => (
                                      <CheckBox
                                        className='text-xs capitalize'
                                        key={`${p.id}-${i}`}
                                        text={action}
                                        value={isActionSelected(p.id, action)}
                                        onValueChanged={() => toggleAction(p.id, action)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  </TabPanelItem>

                  <TabPanelItem title='Reports' visible={!isReportingDisabled}>
                    <Toolbar className='mt-5'>
                      <CommonPageHeaderToolbarItems
                        dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
                        dataGridRef={dataGridRef}
                        exportOptions={{ isHide: true }}
                      />
                    </Toolbar>

                    <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
                      <CommonDataGrid
                        dataGridRef={dataGridRef}
                        data={reports.data}
                        isLoading={reports.isLoading || roleReports.isLoading}
                        storageKey={DATAGRID_STORAGE_KEY}
                        keyExpr='code'
                        isSelectionEnable
                        dataGridStore={dataGridStore}
                        selectedRowKeys={selectedRowKeys}
                        callbacks={{ onCellPrepared: handleOnCellPrepared, onSelectionChanged: handleOnSelectionChange }}
                      >
                        <Column dataField='code' minWidth={100} dataType='string' caption='ID' sortOrder='asc' />
                        <Column dataField='title' dataType='string' caption='Title' />
                        <Column dataField='fileName' dataType='string' caption='File Name' />
                        <Column dataField='description' dataType='string' caption='Description' />
                        <Column
                          dataField='type'
                          dataType='string'
                          caption='Type'
                          calculateCellValue={(rowData) => REPORT_TYPE_LABEL?.[rowData.type as '1' | '2']}
                        />
                        <Column
                          dataField='isActive'
                          dataType='string'
                          caption='Status'
                          calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
                        />
                        <Column
                          dataField='isFeatured'
                          dataType='string'
                          caption='Featured'
                          calculateCellValue={(rowData) => (rowData.isFeatured ? 'Yes' : 'No')}
                        />
                        <Column
                          dataField='isDefault'
                          dataType='string'
                          caption='Default'
                          calculateCellValue={(rowData) => (rowData.isDefault ? 'Yes' : 'No')}
                        />
                        <Column
                          dataField='isInternal'
                          dataType='string'
                          caption='Internal'
                          calculateCellValue={(rowData) => (rowData.isInternal ? 'Yes' : 'No')}
                        />

                        <Column dataField='createdAt' dataType='datetime' caption='Created At' />
                        <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

                        <Column type='buttons' fixed fixedPosition='right' minWidth={150} caption='Actions'>
                          <CanView subject='p-reports' action='view (owner)'>
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
                        </Column>
                      </CommonDataGrid>
                    </PageContentWrapper>
                  </TabPanelItem>
                </TabPanel>
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
