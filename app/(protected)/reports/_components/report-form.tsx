'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Popup from 'devextreme-react/popup'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { type ReportForm, reportFormSchema, ReportType } from '@/schema/report'
import { getReportByCode, upsertReport } from '@/actions/report'
import { PageMetadata } from '@/types/common'
import CanView from '@/components/acl/can-view'
import LoadingButton from '@/components/loading-button'
import { useAction } from 'next-safe-action/hooks'
import TextAreaField from '@/components/forms/text-area-field'
import TextBoxField from '@/components/forms/text-box-field'
import SwitchField from '@/components/forms/switch-field'
import { DashboardDesignerModule, PaginatedDesignerModule } from '@/utils/stimulsoft'

type ReportFormProps = { pageMetaData: PageMetadata; report: Awaited<ReturnType<typeof getReportByCode>> }

const ReportDesigner = dynamic(() => import('@/components/report-designer'), { ssr: false })

export default function ReportForm({ pageMetaData, report }: ReportFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }
  const searchParams = useSearchParams()

  // const notificationContext = useContext(NotificationContext)

  const type = (searchParams.get('type') || '1') as ReportType

  const isCreate = code === 'add' || !report

  const [isOpen, setIsOpen] = useState(false)

  const values = useMemo(() => {
    if (report) return report

    if (isCreate) {
      return {
        code: -1,
        title: '',
        fileName: '',
        description: '',
        isActive: true,
        type,
        data: '',
        isFeatured: true,
        isDefault: false,
        isInternal: false,
      }
    }

    return undefined
  }, [isCreate, type, JSON.stringify(report)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(reportFormSchema),
  })

  const fileName = useWatch({ control: form.control, name: 'fileName' })

  const { executeAsync, isExecuting } = useAction(upsertReport)

  const handleOnSubmit = async (formData: ReportForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('fileName', { type: 'custom', message: result.message })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.report && 'id' in result?.data?.report) {
        router.refresh()
        handleClose()
        // notificationContext?.handleRefresh()

        setTimeout(() => {
          if (isCreate) router.push(`/reports`)
          else router.push(`/reports/${result.data.report.code}?type=${result.data.report.type}`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleOnSaveAsReport = (
    args: DashboardDesignerModule.Stimulsoft.Designer.SaveReportArgs | PaginatedDesignerModule.Stimulsoft.Designer.SaveReportArgs,
    _callback: () => void
  ) => {
    //* only allow to trigger this funciton when create new report
    args.preventDefault = true //* prevent the event

    if (!isCreate) return

    const jsonString = args.report.saveToJsonString()

    //* set form data
    form.setValue('data', jsonString)

    setIsOpen(true)
  }

  const handleOnSaveReport = (
    args: DashboardDesignerModule.Stimulsoft.Designer.SaveReportArgs | PaginatedDesignerModule.Stimulsoft.Designer.SaveReportArgs,
    _callback: () => void
  ) => {
    args.preventDefault = true //* prevent the event

    //* only allow to trigger this funciton when editing existing report
    if (isCreate) return

    const jsonString = args.report.saveToJsonString()

    //* set form data
    form.setValue('data', jsonString)

    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  useEffect(() => {
    const result = fileName ? fileName.toLowerCase().replaceAll(' ', '-') : ''
    form.setValue('fileName', result)
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName])

  return (
    <div className='flex h-full flex-col gap-5' id='report-form-container'>
      <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/reports')} />
        </Item>

        {report && (
          <>
            <CanView subject='p-reports' action='create'>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add Dashboard', icon: 'add', onClick: () => router.push('/reports/add?type=1') }}
              />
            </CanView>

            <CanView subject='p-reports' action='create'>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add Paginated', icon: 'add', onClick: () => router.push('/reports/add?type=2') }}
              />
            </CanView>

            <CanView subject='p-reports' action='view (owner)'>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'View', icon: 'eyeopen', onClick: () => router.push(`/reports/${report.code}/view`) }}
              />
            </CanView>
          </>
        )}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_150px)]'>
        <div className='grid h-full grid-cols-12 gap-5 p-2'>
          <div className='col-span-12 [&>div]:h-full'>
            <ReportDesigner
              key={report?.code}
              type={type}
              data={report?.data}
              designerProps={{
                onSaveAsReport: handleOnSaveAsReport,
                onSaveReport: handleOnSaveReport,
              }}
              config={{ isHideSaveButton: isCreate, isHideSaveAsButton: !isCreate }}
            />
          </div>
        </div>

        <Popup visible={isOpen} dragEnabled={false} showTitle={false} maxHeight={480} maxWidth={700} onHiding={() => setIsOpen(false)}>
          <FormProvider {...form}>
            <form className='flex h-fit w-full flex-col gap-3' onSubmit={form.handleSubmit(handleOnSubmit)}>
              <PageHeader title={pageMetaData.title} description={pageMetaData.description} className='bg-transparent p-0 shadow-none'>
                <Item location='after' locateInMenu='auto' widget='dxButton'>
                  <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={handleClose} />
                </Item>

                <Item location='after' locateInMenu='auto' widget='dxButton'>
                  <LoadingButton
                    text='Save'
                    type='default'
                    stylingMode='contained'
                    icon='save'
                    isLoading={isExecuting}
                    disabled={isExecuting}
                    useSubmitBehavior
                  />
                </Item>
              </PageHeader>

              <PageContentWrapper className='max-h-[calc(100%_-_92px)] shadow-none'>
                <ScrollView>
                  <div className='grid h-full grid-cols-12 gap-5'>
                    {/* <FormDebug form={form} /> */}

                    <div className='col-span-12 md:col-span-6'>
                      <TextBoxField control={form.control} name='title' label='Title' isRequired />
                    </div>

                    <div className='col-span-12 md:col-span-6'>
                      <TextBoxField
                        control={form.control}
                        name='fileName'
                        label='fileName'
                        isRequired
                        description='File name must be unique'
                      />
                    </div>

                    <div className='col-span-12'>
                      <TextAreaField control={form.control} name='description' label='Description' />
                    </div>

                    <div className='col-span-12 md:col-span-6'>
                      <SwitchField
                        layout='wide'
                        control={form.control}
                        name='isActive'
                        label='Active'
                        description='Is this report active?'
                        extendedProps={{ switchOptions: { disabled: isCreate } }}
                      />
                    </div>

                    <div className='col-span-12 md:col-span-6'>
                      <SwitchField
                        layout='wide'
                        control={form.control}
                        name='isInternal'
                        label='Internal'
                        description='Is this report internal?'
                      />
                    </div>

                    <div className='col-span-12 md:col-span-6'>
                      <SwitchField
                        layout='wide'
                        control={form.control}
                        name='isDefault'
                        label='Default'
                        description='Make this report default? Only 1 default report.'
                      />
                    </div>

                    <div className='col-span-12 md:col-span-6'>
                      <SwitchField
                        layout='wide'
                        control={form.control}
                        name='isFeatured'
                        label='Featured'
                        description='Make this report featured?'
                      />
                    </div>
                  </div>
                </ScrollView>
              </PageContentWrapper>
            </form>
          </FormProvider>
        </Popup>
      </PageContentWrapper>
    </div>
  )
}
