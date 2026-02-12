'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useContext, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type ProjectIndividualForm, projectIndividualFormSchema } from '@/schema/project-individual'
import TextBoxField from '@/components/forms/text-box-field'
import { FormDebug } from '@/components/forms/form-debug'
import LoadingButton from '@/components/loading-button'
import { getPiByCode, upsertPi } from '@/actions/project-individual'
import { PageMetadata } from '@/types/common'
import { usePgs } from '@/hooks/safe-actions/project-group'
import SelectBoxField from '@/components/forms/select-box-field'
import { useNonBpUsers, useUsersByRoleKey } from '@/hooks/safe-actions/user'
import TagBoxField from '@/components/forms/tag-box-field'
import TextAreaField from '@/components/forms/text-area-field'
import { commonItemRender, userItemRender } from '@/utils/devextreme'
import SwitchField from '@/components/forms/switch-field'
import CanView from '@/components/acl/can-view'
import { useBps } from '@/hooks/safe-actions/business-partner'
import { NotificationContext } from '@/context/notification'

type ProjectIndividualFormProps = { pageMetaData: PageMetadata; projectIndividual: Awaited<ReturnType<typeof getPiByCode>> }

export default function ProjectIndividualForm({ pageMetaData, projectIndividual }: ProjectIndividualFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  // const notificationContext = useContext(NotificationContext)

  const isCreate = code === 'add' || !projectIndividual

  const values = useMemo(() => {
    if (projectIndividual) return projectIndividual

    if (isCreate) {
      return {
        code: -1,
        name: '',
        description: '',
        isActive: true,
        groupCode: null,
        customers: [],
        suppliers: [],
        pics: [],
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(projectIndividual)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(projectIndividualFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(upsertPi)

  const projectGroups = usePgs()
  const customerUsers = useUsersByRoleKey('business-partner')
  const nonCustomerUsers = useNonBpUsers()
  const suppliers = useBps('S', true)

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
        // notificationContext?.handleRefresh()

        setTimeout(() => {
          if (isCreate) router.push(`/project/individuals`)
          else router.push(`/project/individuals/${result.data?.projectIndividual.code}`)
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
            <Button
              text='Back'
              icon='arrowleft'
              stylingMode='outlined'
              type='default'
              onClick={() => router.push('/project/individuals')}
            />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={
                CanView({ isReturnBoolean: true, subject: 'p-projects-individuals', action: !projectIndividual ? ['create'] : ['edit'] })
                  ? false
                  : true
              }
            />
          </Item>

          {projectIndividual && (
            <>
              <CanView subject='p-projects-individuals' action='create'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/project/individuals/add`) }}
                />
              </CanView>

              <CanView subject='p-projects-individuals' action='view'>
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
              </CanView>
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <TextBoxField control={form.control} name='name' label='Name' isRequired />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SelectBoxField
                  data={projectGroups.data}
                  isLoading={projectGroups.isLoading}
                  control={form.control}
                  name='groupCode'
                  label='Group'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['name', 'code']}
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

              <div className='col-span-12 md:col-span-6 lg:col-span-4'>
                <SwitchField
                  control={form.control}
                  name='isActive'
                  label='Active'
                  description='Is this project individual active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={form.control} name='description' label='Description' />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TagBoxField
                  data={customerUsers.data}
                  isLoading={customerUsers.isLoading}
                  control={form.control}
                  name='customers'
                  label='Customers'
                  valueExpr='code'
                  displayExpr={(item) =>
                    item
                      ? `${[item?.fname, item?.lname].filter(Boolean).join(' ')} ${item?.customerCode ? `(${item?.customerCode})` : ''}`
                      : ''
                  }
                  searchExpr={['fname', 'lname', 'code', 'email', 'customerCode']}
                  extendedProps={{
                    tagBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: `${[params?.fname, params?.lname].filter(Boolean).join(' ')} ${params?.customerCode ? `(${params?.customerCode})` : ''}`,
                          description: params?.email,
                          value: params?.code,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6'>
                <TagBoxField
                  data={suppliers.data}
                  isLoading={suppliers.isLoading}
                  control={form.control}
                  name='suppliers'
                  label='Suppliers Codes'
                  valueExpr='CardCode'
                  displayExpr={(item) => (item ? `${item?.CardName} (${item?.CardCode})` : '')}
                  searchExpr={['CardName', 'CardCode', 'GroupName']}
                  extendedProps={{
                    tagBoxOptions: {
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

              <div className='col-span-12 md:col-span-6'>
                <TagBoxField
                  data={nonCustomerUsers.data}
                  isLoading={nonCustomerUsers.isLoading}
                  control={form.control}
                  name='pics'
                  label='PICs'
                  valueExpr='code'
                  displayExpr={(item) => (item ? `${item?.fname}${item?.lname ? ` ${item?.lname}` : ''}` : '')}
                  searchExpr={['fname', 'lname', 'code', 'email']}
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
