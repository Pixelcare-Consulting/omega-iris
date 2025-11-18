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
import { type ProjectIndividualForm, projectIndividualFormSchema } from '@/schema/project-individual'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getProjectIndividualByCode, upsertProjectIndividual } from '@/actions/project-individual'
import { PageMetadata } from '@/types/common'
import { useProjectGroupsClient } from '@/hooks/safe-actions/project-group'
import SelectBoxField from '@/components/forms/select-box-field'
import { useNonCustomerUsersClient, useUsersByRoleKeyClient } from '@/hooks/safe-actions/user'
import TagBoxField from '@/components/forms/tag-box-field'
import TextAreaField from '@/components/forms/text-area-field'
import { commonItemRender, userItemRender } from '@/utils/devextreme'

type ProjectIndividualFormProps = { pageMetaData: PageMetadata; projectIndividual: Awaited<ReturnType<typeof getProjectIndividualByCode>> }

export default function ProjectIndividualForm({ pageMetaData, projectIndividual }: ProjectIndividualFormProps) {
  const router = useRouter()
  const { code } = useParams()

  const isCreate = code === 'add' || !projectIndividual

  const values = useMemo(() => {
    if (projectIndividual) return projectIndividual

    if (isCreate) {
      return {
        code: -1,
        name: '',
        description: '',
        groupCode: 0,
        customers: [],
        pics: [],
      }
    }

    return undefined
  }, [])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(projectIndividualFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertProjectIndividual)

  const projectGroupsClient = useProjectGroupsClient()
  const userByRoleKeyClient = useUsersByRoleKeyClient('customer')
  const nonCustomerUsersClient = useNonCustomerUsersClient()

  const handleOnSubmit = async (formData: ProjectIndividualForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.projectIndividual && 'id' in result?.data?.projectIndividual) {
        router.refresh()

        setTimeout(() => {
          router.push(`/project/individuals/${result.data?.projectIndividual.code}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  useEffect(() => {
    console.log({ projectGroupsClient })
  }, [JSON.stringify(projectGroupsClient)])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/project/individuals')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {projectIndividual && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/project/individuals/add`) }}
              />

              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{
                  text: 'View',
                  icon: 'eyeopen',
                  onClick: () => router.push(`/project/individuals/${projectIndividual.code}/view`),
                }}
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

              <div className='col-span-12 md:col-span-6'>
                <SelectBoxField
                  data={projectGroupsClient.data}
                  isLoading={projectGroupsClient.isLoading}
                  control={form.control}
                  name='groupCode'
                  label='Group'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['name', 'code']}
                  isRequired
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.name,
                          description: params?.description,
                          value: params?.code,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='description' label='Description' />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TagBoxField
                  data={userByRoleKeyClient.data}
                  isLoading={userByRoleKeyClient.isLoading}
                  control={form.control}
                  name='customers'
                  label='Customers'
                  valueExpr='code'
                  displayExpr={(item) => (item ? `${item?.fname} (${item?.lname})` : '')}
                  searchExpr={['fname', 'lname', 'code']}
                  isRequired
                  extendedProps={{ tagBoxOptions: { itemRender: userItemRender } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TagBoxField
                  data={nonCustomerUsersClient.data}
                  isLoading={nonCustomerUsersClient.isLoading}
                  control={form.control}
                  name='pics'
                  label='P.I.Cs'
                  valueExpr='code'
                  displayExpr={(item) => (item ? `${item?.fname} (${item?.lname})` : '')}
                  searchExpr={['fname', 'lname', 'code']}
                  isRequired
                  extendedProps={{ tagBoxOptions: { itemRender: userItemRender } }}
                />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
