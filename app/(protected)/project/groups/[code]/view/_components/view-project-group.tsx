'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getProjectGroupByCode } from '@/actions/project-group'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ProjectGroupOverviewTab from './_tabs/project-group-overview-tab'
import UnderDevelopment from '@/app/under-development'
import { useProjectIndividualsByGroupCodeClient } from '@/hooks/safe-actions/project-individual'
import ProjectGroupProjectsTab from './_tabs/project-group-projects-tab'

type ViewProjectGroupProps = {
  projectGroup: NonNullable<Awaited<ReturnType<typeof getProjectGroupByCode>>>
}

export default function ViewProjectGroup({ projectGroup }: ViewProjectGroupProps) {
  const router = useRouter()

  const projects = useProjectIndividualsByGroupCodeClient(projectGroup.code)

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Project Group Details' description='View the comprehensive details of this project group.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/project/groups')}
          />
        </Item>

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
          options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/project/groups/${projectGroup.code}`) }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <ProjectGroupOverviewTab projectGroup={projectGroup} />
          </TabPanelITem>

          <TabPanelITem title='Projects'>
            <ProjectGroupProjectsTab groupCode={projectGroup.code} projects={projects} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
