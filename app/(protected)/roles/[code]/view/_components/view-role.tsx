'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getRolesByCode } from '@/actions/roles'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import RolesOverviewTab from './_tabs/role-overview-tab'
import UnderDevelopment from '@/app/under-development'
import CanView from '@/components/acl/can-view'

type ViewRolesProps = {
  role: NonNullable<Awaited<ReturnType<typeof getRolesByCode>>>
}

export default function ViewRole({ role }: ViewRolesProps) {
  const router = useRouter()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Role Details' description='View the comprehensive details of this role.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/roles')}
          />
        </Item>

        <CanView subject='p-roles' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/roles/add`) }}
          />
        </CanView>

        <CanView subject='p-roles' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/roles/${role.code}`) }}
          />
        </CanView>
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <RolesOverviewTab role={role} />
          </TabPanelITem>

          {/* <TabPanelITem title='Permissions'>
            <UnderDevelopment className='h-[60vh]' />
          </TabPanelITem> */}
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
