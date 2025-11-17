'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
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
import useRolesClient from '@/hooks/safe-actions/use-roles-client'
import SelectBoxField from '@/components/forms/select-box-field'
import { PageMetadata } from '@/types/common'

type UserPageContentProps = { pageMetaData: PageMetadata; user: Awaited<ReturnType<typeof getUserByCode>> }

export default function UserForm({ pageMetaData, user }: UserPageContentProps) {
  const router = useRouter()
  const { code } = useParams()

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
  const rolesClient = useRolesClient()

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

        setTimeout(() => {
          router.push(`/users/${result.data.user.code}`)
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
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/users')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {user && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/users/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/users/${user.code}/view`) }}
              />
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView useNative={false} scrollByContent scrollByThumb>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='fname' label='First Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='lname' label='Last Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='username' label='Username' isRequired description='Username must be unique' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='email' label='Email' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={rolesClient.data}
                  isLoading={rolesClient.isLoading}
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
                </>
              )}

              {roleKey && roleKey === 'customer' && (
                <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                  <TextBoxField
                    control={form.control}
                    name='customerCode'
                    label='Customer Code'
                    description='SAP customer code'
                    isRequired
                  />
                </div>
              )}

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField control={form.control} name='isActive' label='Active' description='Is this user active?' />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
