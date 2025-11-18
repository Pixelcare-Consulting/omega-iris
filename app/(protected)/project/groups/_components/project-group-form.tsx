'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type ProjectGroupForm, projectGroupFormSchema } from '@/schema/project-group'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getProjectGroupByCode, upsertProjectGroup } from '@/actions/project-group'
import { PageMetadata } from '@/types/common'
import SwitchField from '@/components/forms/switch-field'
import TextAreaField from '@/components/forms/text-area-field'

type ProjectGroupFormProps = { pageMetaData: PageMetadata; projectGroup: Awaited<ReturnType<typeof getProjectGroupByCode>> }

export default function ProjectGroupForm({ pageMetaData, projectGroup }: ProjectGroupFormProps) {
  const router = useRouter()
  const { code } = useParams()

  const isCreate = code === 'add' || !projectGroup

  const values = useMemo(() => {
    if (projectGroup) return projectGroup

    if (isCreate) {
      return {
        code: -1,
        name: '',
        description: '',
        isActive: true,
      }
    }

    return undefined
  }, [])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(projectGroupFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertProjectGroup)

  const handleOnSubmit = async (formData: ProjectGroupForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.projectGroup && 'id' in result?.data?.projectGroup) {
        router.refresh()

        setTimeout(() => {
          router.push(`/project/groups/${result.data.projectGroup.code}`)
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
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/project/groups')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {projectGroup && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/project/groups/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/project/groups/${projectGroup.code}/view`) }}
              />
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView useNative={false} scrollByContent scrollByThumb>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6'>
                <TextBoxField control={form.control} name='name' label='Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  name='isActive'
                  label='Active'
                  description='Is this project group active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
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
