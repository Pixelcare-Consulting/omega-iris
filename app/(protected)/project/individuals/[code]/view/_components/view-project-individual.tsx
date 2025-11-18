'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getProjectIndividualByCode } from '@/actions/project-individual'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ProjectIndividualOverviewTab from '../_tabs/project-individual-overview-tab'
import UnderDevelopment from '@/app/under-development'
import { useNonCustomerUsersClient, useUsersByRoleKeyClient } from '@/hooks/safe-actions/user'

type ViewProjectIndividualProps = {
  projectIndividual: NonNullable<Awaited<ReturnType<typeof getProjectIndividualByCode>>>
}

export default function ViewProjectIndividual({ projectIndividual }: ViewProjectIndividualProps) {
  const router = useRouter()

  const customerUsers = useUsersByRoleKeyClient('customer')
  const nonCustomerUsers = useNonCustomerUsersClient()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Project Individual Details' description='View the comprehensive details of this project individual.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/project/individuals')}
          />
        </Item>

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
          options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/project/individuals/${projectIndividual.code}`) }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <ProjectIndividualOverviewTab projectIndividual={projectIndividual} />
          </TabPanelITem>

          <TabPanelITem title='Customers'>
            <UnderDevelopment className='h-[60vh]' />
          </TabPanelITem>

          <TabPanelITem title='P.I.Cs'>
            <UnderDevelopment className='h-[60vh]' />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
