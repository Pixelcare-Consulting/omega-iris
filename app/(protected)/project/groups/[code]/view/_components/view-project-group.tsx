'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getPgByCode } from '@/actions/project-group'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ProjectGroupOverviewTab from './_tabs/project-group-overview-tab'
import UnderDevelopment from '@/app/under-development'
import { usePisByGroupCode } from '@/hooks/safe-actions/project-individual'
import ProjectGroupProjectsTab from './_tabs/project-group-projects-tab'
import CanView from '@/components/acl/can-view'

type ViewProjectGroupProps = {
  projectGroup: NonNullable<Awaited<ReturnType<typeof getPgByCode>>>
}

export default function ViewProjectGroup({ projectGroup }: ViewProjectGroupProps) {
  const router = useRouter()

  const projects = usePisByGroupCode(projectGroup.code)

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

        <CanView subject='p-projects-groups' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/project/groups/add`) }}
          />
        </CanView>

        <CanView subject='p-projects-groups' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/project/groups/${projectGroup.code}`) }}
          />
        </CanView>
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
