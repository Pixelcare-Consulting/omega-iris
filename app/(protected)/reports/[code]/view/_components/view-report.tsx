'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getReportByCode } from '@/actions/report'
import PageHeader from '@/app/(protected)/_components/page-header'
import CanView from '@/components/acl/can-view'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ReportOverviewTab from './_tabs/report-overview-tab'
import ReportViewerTab from './_tabs/report-viewer-tab'

type ViewReportProps = {
  report: NonNullable<Awaited<ReturnType<typeof getReportByCode>>>
}

export default function ViewReport({ report }: ViewReportProps) {
  const router = useRouter()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Report Details' description='View the comprehensive details of this report.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/reports')}
          />
        </Item>

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

        <CanView subject='p-reports' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/reports/${report.code}?type=${report.type}`) }}
          />
        </CanView>
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_150px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <ReportOverviewTab report={report} />
          </TabPanelITem>

          <TabPanelITem title='Report'>
            <ReportViewerTab report={report} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
