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

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type RoleForm, roleFormSchema } from '@/schema/role'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getRolesByCode, upsertRole } from '@/actions/roles'
import { PageMetadata } from '@/types/common'
import TextAreaField from '@/components/forms/text-area-field'

type RoleFormProps = { pageMetaData: PageMetadata; role: Awaited<ReturnType<typeof getRolesByCode>> }

export default function RoleForm({ pageMetaData, role }: RoleFormProps) {
  const router = useRouter()
  const { code } = useParams()

  const isCreate = code === 'add' || !role

  const values = useMemo(() => {
    if (role) return role

    if (isCreate) {
      return {
        code: -1,
        key: '',
        name: '',
        description: '',
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(role)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(roleFormSchema),
  })

  const name = useWatch({ control: form.control, name: 'name' }) || ''

  const { executeAsync, isExecuting } = useAction(upsertRole)

  const handleOnSubmit = async (formData: RoleForm) => {
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

        setTimeout(() => {
          router.push(`/security/roles/${result.data.role.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  //* update role key based on name
  useEffect(() => {
    const result = name ? name.toLowerCase().replaceAll(' ', '-') : ''
    form.setValue('key', result)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/security/roles')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {role && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/security/roles/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/security/roles/${role.code}/view`) }}
              />
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
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
