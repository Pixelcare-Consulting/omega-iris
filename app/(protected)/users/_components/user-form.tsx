'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useContext, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '../../_components/page-header'
import PageContentWrapper from '../../_components/page-content-wrapper'
import { type UserForm, userFormSchema } from '@/schema/user'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import SwitchField from '@/components/forms/switch-field'
import LoadingButton from '@/components/loading-button'
import { getUserByCode, upsertUser } from '@/actions/users'
import { useRoles } from '@/hooks/safe-actions/roles'
import SelectBoxField from '@/components/forms/select-box-field'
import { PageMetadata } from '@/types/common'
import Separator from '@/components/separator'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { useBps } from '@/hooks/safe-actions/business-partner'
import { commonItemRender } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'
import { NotificationContext } from '@/context/notification'
import { useSession } from 'next-auth/react'
import { BUSINESS_PARTNER_ROLE_KEY, SUPER_USER_ROLE_KEY } from '@/constants/role'
import TagBoxField from '@/components/forms/tag-box-field'
import { HIDDEN_FIELD_MODULES } from '@/constants/hidden-field'

type UserFormProps = { pageMetaData: PageMetadata; user: Awaited<ReturnType<typeof getUserByCode>> }

export default function UserForm({ pageMetaData, user }: UserFormProps) {
  const router = useRouter()

  const { code } = useParams() as { code: string }

  const { data: session } = useSession()
  const notificationContext = useContext(NotificationContext)

  const isCreate = code === 'add' || !user

  const hiddenFieldModules = useMemo(
    () =>
      HIDDEN_FIELD_MODULES.map((m) => ({
        ...m,
        options: Object.entries(m.columns).map(([key, value]) => ({ label: value, value: key })),
      })),
    []
  )

  //* every module starts with an empty list, so a user without a saved row is still valid
  const emptyHiddenFields = useMemo(() => Object.fromEntries(HIDDEN_FIELD_MODULES.map((m) => [m.moduleName, [] as string[]])), [])

  const values = useMemo(() => {
    if (user)
      return {
        ...user,
        roleKey: user.role.key,
        hiddenFields: { ...emptyHiddenFields, ...Object.fromEntries(user.hiddenFields.map((row) => [row.moduleName, row.fields])) },
        password: '',
        confirmPassword: '',
        newPassword: '',
        newConfirmPassword: '',
        isForceToChangePassword: user.isDefaultPasswordChanged ? false : true,
      }

    if (isCreate) {
      return {
        code: -1,
        fname: '',
        lname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        roleCode: 0,
        roleKey: '',
        isActive: true,
        oldPassword: '',
        newPassword: '',
        newConfirmPassword: '',
        customerCode: '',
        supplierCode: '',
        isForceToChangePassword: true,
        isLocked: false,
        hiddenFields: emptyHiddenFields,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(user)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(userFormSchema),
  })

  const roleKey = useWatch({ control: form.control, name: 'roleKey' })

  const { executeAsync, isExecuting } = useAction(upsertUser)

  const customers = useBps(
    ['C', ...(process.env.NEXT_PUBLIC_SYNCED_STRICT === 'true' ? [] : ['L'])],
    process.env.NEXT_PUBLIC_SYNCED_STRICT === 'true' ? true : false
  )
  const roles = useRoles()

  //! useBps only returns the active database, so a customer from another one is missing and the field renders blank
  //* keep the saved customer in the list, otherwise editing an unrelated field would silently clear it
  const customerOptions = useMemo(() => {
    const options = customers.data || []
    const saved = user?.customer

    if (!saved || options.some((option) => option.CardCode === saved.CardCode)) return options

    return [{ ...saved, GroupName: saved.GroupName || saved.sapDatabase?.name || null }, ...options]
  }, [JSON.stringify(customers.data), JSON.stringify(user?.customer)])

  const isAdmin = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === SUPER_USER_ROLE_KEY
  }, [JSON.stringify(session)])

  const roleOptions = useMemo(() => {
    if (!roles.data || roles.data.length < 1 || roles.isLoading) return []

    return roles.data.filter((role) => (isAdmin ? true : role.key !== SUPER_USER_ROLE_KEY)).map((role) => role)
  }, [JSON.stringify(roles), isAdmin])

  const handleOnSubmit = async (formData: UserForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401 && result.paths && result.paths.length > 0) {
          result.paths.forEach((path) => {
            const field = path.field as keyof UserForm
            form.setError(field, { type: 'custom', message: path.message })
          })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.user && 'id' in result?.data?.user) {
        router.refresh()
        // notificationContext?.handleRefresh()

        setTimeout(() => {
          if (isCreate) router.push(`/users`)
          else router.push(`/users/${result.data.user.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/users')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={CanView({ isReturnBoolean: true, subject: 'p-users', action: !user ? ['create'] : ['edit'] }) ? false : true}
            />
          </Item>

          {user && (
            <>
              <CanView subject='p-users' action='create'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/users/add`) }}
                />
              </CanView>

              <CanView subject='p-users' action='view'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/users/${user.code}/view`) }}
                />
              </CanView>
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView useNative>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='fname' label='First Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='lname' label='Last Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='username' label='Username' description='Username must be unique' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='email' label='Email' description='Email must be unique' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={roleOptions}
                  isLoading={roles.isLoading}
                  control={form.control}
                  name='roleCode'
                  label='Role'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['name', 'description']}
                  isRequired
                  callback={(args) => form.setValue('roleKey', args.item?.key)}
                />
              </div>

              {isCreate ? (
                <>
                  <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                    <TextBoxField
                      control={form.control}
                      name='password'
                      label='Password'
                      isRequired
                      extendedProps={{ textBoxOptions: { mode: 'password' } }}
                    />
                  </div>

                  <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                    <TextBoxField
                      control={form.control}
                      name='confirmPassword'
                      label='Confirm Password'
                      isRequired
                      extendedProps={{ textBoxOptions: { mode: 'password' } }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                    <TextBoxField
                      control={form.control}
                      name='newPassword'
                      label='New Password'
                      isRequired
                      extendedProps={{ textBoxOptions: { mode: 'password' } }}
                    />
                  </div>

                  <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                    <TextBoxField
                      control={form.control}
                      name='newConfirmPassword'
                      label='New Confirm Password'
                      isRequired
                      extendedProps={{ textBoxOptions: { mode: 'password' } }}
                    />
                  </div>

                  <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                    <SwitchField control={form.control} name='isActive' label='Active' description='Is this user active?' />
                  </div>
                </>
              )}

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  name='isForceToChangePassword'
                  label='Force To change Password'
                  description='Required the user to change their password upon next login'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField control={form.control} name='isLocked' label='Locked' description='Locked user cannot sign in' />
              </div>

              {roleKey && roleKey === BUSINESS_PARTNER_ROLE_KEY && (
                <>
                  <Separator className='col-span-12' />
                  <ReadOnlyFieldHeader className='col-span-12 mb-2' title='SAP Details' description='User SAP information' />

                  <div className='col-span-12 md:col-span-6'>
                    <SelectBoxField
                      data={customerOptions}
                      isLoading={customers.isLoading}
                      control={form.control}
                      name='customerCode'
                      label='Customer'
                      valueExpr='CardCode'
                      displayExpr='CardName'
                      searchExpr={['CardName', 'CardCode', 'GroupName']}
                      extendedProps={{
                        selectBoxOptions: {
                          itemRender: (params) => {
                            return commonItemRender({
                              title: params?.CardName,
                              description: params?.GroupName,
                              value: params?.CardCode,
                            })
                          },
                        },
                      }}
                    />
                  </div>

                  {/* <div className='col-span-12 md:col-span-6'>
                    <SelectBoxField
                      data={suppliers.data}
                      isLoading={suppliers.isLoading}
                      control={form.control}
                      name='supplierCode'
                      label='Supplier'
                      valueExpr='CardCode'
                      displayExpr='CardName'
                      searchExpr={['CardName', 'CardCode', 'GroupName']}
                      extendedProps={{
                        selectBoxOptions: {
                          itemRender: (params) => {
                            return commonItemRender({
                              title: params?.CardName,
                              description: params?.GroupName,
                              value: params?.CardCode,
                            })
                          },
                        },
                      }}
                    />
                  </div> */}
                </>
              )}

              {/* //* admins see every field, so only other roles get hidden fields */}
              {roleKey && roleKey !== SUPER_USER_ROLE_KEY && (
                <>
                  <Separator className='col-span-12' />
                  <ReadOnlyFieldHeader className='col-span-12 mb-2' title='Hidden Fields' description='Fields this user will not see' />

                  {hiddenFieldModules.map((m) => (
                    <div key={m.moduleName} className='col-span-12 md:col-span-6'>
                      <TagBoxField
                        data={m.options}
                        control={form.control}
                        name={`hiddenFields.${m.moduleName}`}
                        label={m.label}
                        valueExpr='value'
                        displayExpr='label'
                        searchExpr={['label', 'value']}
                        description={m.description}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
