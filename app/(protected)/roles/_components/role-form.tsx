'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { CheckBox } from 'devextreme-react/check-box'

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

type RoleFormProps = { pageMetaData: PageMetadata; role: Awaited<ReturnType<typeof getRolesByCode>> }

export default function RoleForm({ pageMetaData, role }: RoleFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  // const notificationContext = useContext(NotificationContext)

  const isCreate = code === 'add' || !role

  const permissions = usePermissions()
  const rolePermissions = useRolePermissions(role?.id ?? '')

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

  //* update role key based on name
  useEffect(() => {
    const result = name ? name.toLowerCase().replaceAll(' ', '-') : ''
    form.setValue('key', result)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  //* set permissions
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
      }

      form.reset(roleObj)
      return
    }

    let rps: { id: string; actions: string[] }[] = []

    const pdata = permissions.data.filter((p) => !p.isParent)

    if (role && !rolePermissions.isLoading && rolePermissions.data.length > 0) {
      rps = rolePermissions.data.map((rp) => ({ id: rp.permissionId, actions: rp.actions }))
    } else rps = pdata.map((p) => ({ id: p.id, actions: [] }))

    if (role.key === 'admin') rps = pdata.map((p) => ({ id: p.id, actions: p.allowedActions }))

    const roleObj = { ...role, permissions: rps }

    form.reset(roleObj)
  }, [isCreate, JSON.stringify(role), JSON.stringify(permissions), JSON.stringify(rolePermissions)])

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
          <ScrollView>
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
              <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Permissions' description='Set the permissions for this role' />

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
                                <div key={`${p.id}-${pChild.id}`} className='col-span-12 grid grid-cols-12 p-2 hover:bg-slate-400/10'>
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
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
