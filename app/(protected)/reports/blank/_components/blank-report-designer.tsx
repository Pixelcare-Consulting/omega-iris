'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { saveBlankReport } from '@/actions/report'
import { REPORT_TYPE_LABEL } from '@/schema/report'
import { DashboardDesignerModule, PaginatedDesignerModule } from '@/utils/stimulsoft'

const ReportDesigner = dynamic(() => import('@/components/report-designer'), { ssr: false })

type BlankReportDesignerProps = { type: '1' | '2'; data?: string | null }

//* edits the blank report new reports of this type start from, save only
export default function BlankReportDesigner({ type, data }: BlankReportDesignerProps) {
  const router = useRouter()

  const { executeAsync } = useAction(saveBlankReport)

  const handleOnSaveReport = async (
    args: DashboardDesignerModule.Stimulsoft.Designer.SaveReportArgs | PaginatedDesignerModule.Stimulsoft.Designer.SaveReportArgs,
    _callback: () => void
  ) => {
    args.preventDefault = true

    try {
      const response = await executeAsync({ type, data: args.report.saveToJsonString() })
      const result = response?.data

      if (!result || result.error) {
        toast.error(result?.message ?? 'Something went wrong! Please try again later.')
        return
      }

      toast.success(result.message)
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  return (
    <div className='flex h-full flex-col gap-5'>
      <PageHeader
        title={`Blank ${REPORT_TYPE_LABEL[type]} Report`}
        description={`The starting point for every new ${REPORT_TYPE_LABEL[type].toLowerCase()} report.`}
      >
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/reports')} />
        </Item>
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_150px)]'>
        <div className='grid h-full grid-cols-12 gap-5 p-2'>
          <div className='col-span-12 [&>div]:h-full'>
            <ReportDesigner
              type={type}
              //* no saved blank yet opens an empty report
              data={data || undefined}
              designerProps={{ onSaveReport: handleOnSaveReport }}
              config={{ isHideSaveButton: false, isHideSaveAsButton: true }}
            />
          </div>
        </div>
      </PageContentWrapper>
    </div>
  )
}
