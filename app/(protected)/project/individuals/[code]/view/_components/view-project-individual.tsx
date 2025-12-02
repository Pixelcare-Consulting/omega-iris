'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getPiByCode } from '@/actions/project-individual'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ProjectIndividualOverviewTab from './_tabs/project-individual-overview-tab'
import { useNonBpUsers, useUsersByRoleKey } from '@/hooks/safe-actions/user'
import ProjectIndividualCustomerTab from './_tabs/project-individual-customer-tab'
import ProjectIndividualPicTab from './_tabs/project-individual-pic-tab'
import ProjectIndividualItemTable from './project-individual-item-table'
import { useProjecItems } from '@/hooks/safe-actions/project-item'

type ViewProjectIndividualProps = {
  projectIndividual: NonNullable<Awaited<ReturnType<typeof getPiByCode>>>
}

export default function ViewProjectIndividual({ projectIndividual }: ViewProjectIndividualProps) {
  const router = useRouter()

  const customerUsers = useUsersByRoleKey('business-partner')
  const nonCustomerUsers = useNonBpUsers()
  const items = useProjecItems(projectIndividual.code)

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
            <ProjectIndividualCustomerTab
              projectCode={projectIndividual.code}
              customers={projectIndividual.customers}
              users={customerUsers}
            />
          </TabPanelITem>

          <TabPanelITem title='P.I.Cs'>
            <ProjectIndividualPicTab projectCode={projectIndividual.code} pics={projectIndividual.pics} users={nonCustomerUsers} />
          </TabPanelITem>

          <TabPanelITem title='Inventory'>
            <ProjectIndividualItemTable projectCode={projectIndividual.code} projectName={projectIndividual.name} items={items} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
