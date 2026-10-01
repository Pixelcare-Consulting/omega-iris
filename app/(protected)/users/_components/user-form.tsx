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
import CanView from '@/components/acl/can-view'
import { NotificationContext } from '@/context/notification'
import { useSession } from 'next-auth/react'
import { BUSINESS_PARTNER_ROLE_KEY, SUPER_USER_ROLE_KEY } from '@/constants/role'
import TagBoxField from '@/components/forms/tag-box-field'
import { HIDDEN_FIELD_MODULES } from '@/constants/hidden-field'
import { useSapDatabase } from '@/hooks/use-sap-database'
import BpProfileSection from './bp-profile-section'
import { useBpProfileCompanyOptions } from '@/hooks/safe-actions/user-bp-profile'
import { BP_PROFILE_TYPE, buildBpProfileRows } from '@/utils/user-bp-profile'

type UserFormProps = { pageMetaData: PageMetadata; user: Awaited<ReturnType<typeof getUserByCode>> }

export default function UserForm({ pageMetaData, user }: UserFormProps) {
  const router = useRouter()

  const { code } = useParams() as { code: string }

  const { data: session } = useSession()
  const { sapDbCode } = useSapDatabase()
  const bpProfileCompanyOptions = useBpProfileCompanyOptions(BP_PROFILE_TYPE.CUSTOMER)
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
        bpProfiles: buildBpProfileRows(bpProfileCompanyOptions.data, user.bpProfiles, BP_PROFILE_TYPE.CUSTOMER),
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
        bpProfiles: buildBpProfileRows(bpProfileCompanyOptions.data, undefined, BP_PROFILE_TYPE.CUSTOMER),
        isForceToChangePassword: true,
        isLocked: false,
        hiddenFields: emptyHiddenFields,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(user), sapDbCode, JSON.stringify(bpProfileCompanyOptions.data)])

  const form = useForm({
    mode: 'onChange',
    values,
    //! options load after the page, keep what the admin already typed
    resetOptions: { keepDirtyValues: true },
    resolver: zodResolver(userFormSchema),
  })

  const roleKey = useWatch({ control: form.control, name: 'roleKey' })

  const { executeAsync, isExecuting } = useAction(upsertUser)

  const roles = useRoles()

  const isAdmin = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === SUPER_USER_ROLE_KEY
  }, [JSON.stringify(session)])

  const roleOptions = useMemo(() => {
    if (!roles.data || roles.data.length < 1 || roles.isLoading) return []

    return roles.data.filter((role) => (isAdmin ? true : role.key !== SUPER_USER_ROLE_KEY)).map((role) => role)
  }, [JSON.stringify(roles), isAdmin])

  const handleOnSubmit = async (formData: UserForm) => {
    //! Enter still submits a form with a disabled button
    if (!sapDbCode || bpProfileCompanyOptions.isLoading) return

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
              //* wait for the company and its cards, saving before they load would drop the active company's card
              disabled={
                !sapDbCode ||
                bpProfileCompanyOptions.isLoading ||
                !CanView({ isReturnBoolean: true, subject: 'p-users', action: !user ? ['create'] : ['edit'] })
              }
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
                  //! mark it edited, otherwise the reset when options load puts the old role key back
                  callback={(args) => form.setValue('roleKey', args.item?.key, { shouldDirty: true })}
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
                  <ReadOnlyFieldHeader
                    className='col-span-12 mb-2'
                    title='Business Partner Profile'
                    description='One customer per company'
                  />

                  <BpProfileSection
                    className='col-span-12'
                    profileType={BP_PROFILE_TYPE.CUSTOMER}
                    title='Customer'
                    companies={bpProfileCompanyOptions.data}
                    savedProfiles={user?.bpProfiles}
                    isLoading={bpProfileCompanyOptions.isLoading}
                  />

                  {/* //* supplier later: a second BpProfileSection with BP_PROFILE_TYPE.SUPPLIER and its own options */}
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
