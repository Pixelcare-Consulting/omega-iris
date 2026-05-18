'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { getAllProjectItemByCode } from '@/actions/project-item'
import ProjectInventoryOverviewTab from './_tabs/project-inventory-overview-tab'

type ViewProjectInventoryProps = {
  projectItem: NonNullable<Awaited<ReturnType<typeof getAllProjectItemByCode>>>
}

export default function ViewProjectInventory({ projectItem }: ViewProjectInventoryProps) {
  const router = useRouter()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Project Inventory Details' description='View the comprehensive details of this project inventory.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/project/inventory')}
          />
        </Item>
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_180px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <ProjectInventoryOverviewTab projectItem={projectItem} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
