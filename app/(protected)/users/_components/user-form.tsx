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

type UserFormProps = { pageMetaData: PageMetadata; user: Awaited<ReturnType<typeof getUserByCode>> }

export default function UserForm({ pageMetaData, user }: UserFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  // const notificationContext = useContext(NotificationContext)

  const isCreate = code === 'add' || !user

  const values = useMemo(() => {
    if (user) return { ...user, roleKey: user.role.key, password: '', confirmPassword: '', newPassword: '', newConfirmPassword: '' }

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
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(user)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(userFormSchema),
  })

  const oldPassword = useWatch({ control: form.control, name: 'oldPassword' })
  const roleKey = useWatch({ control: form.control, name: 'roleKey' })

  const { executeAsync, isExecuting } = useAction(upsertUser)

  const customers = useBps('C', true)
  const suppliers = useBps('S', true)
  const roles = useRoles()

  const handleOnSubmit = async (formData: UserForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 409) form.setError('oldPassword', { type: 'custom', message: result.message })

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

  //* clear password fields when old password is empty
  useEffect(() => {
    if (!oldPassword) {
      form.setValue('newPassword', '')
      form.setValue('newConfirmPassword', '')
      form.clearErrors(['newPassword', 'newConfirmPassword'])
    }
  }, [oldPassword])

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
          <ScrollView>
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
                  data={roles.data}
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
                      name='oldPassword'
                      label='Old Password'
                      isRequired
                      extendedProps={{ textBoxOptions: { mode: 'password' } }}
                    />
                  </div>

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

              {roleKey && roleKey === 'business-partner' && (
                <>
                  <Separator className='col-span-12' />
                  <ReadOnlyFieldHeader className='col-span-12 mb-2' title='SAP Details' description='User SAP information' />

                  <div className='col-span-12 md:col-span-6'>
                    <SelectBoxField
                      data={customers.data}
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
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
