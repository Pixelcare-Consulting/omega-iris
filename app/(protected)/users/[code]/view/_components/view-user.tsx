'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import ScrollView from 'devextreme-react/scroll-view'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getUserByCode } from '@/actions/users'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import UserOverviewTab from './_tabs/user-overview-tab'
import UnderDevelopment from '@/app/under-development'

type ViewUserProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ViewUser({ user }: ViewUserProps) {
  const router = useRouter()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='User Details' description='View the comprehensive details of this user.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/users')}
          />
        </Item>

        <Item
          location='after'
          locateInMenu='always'
          widget='dxButton'
          options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/users/add`) }}
        />

        <Item
          location='after'
          locateInMenu='always'
          widget='dxButton'
          options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/users/${user.code}`) }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <UserOverviewTab user={user} />
          </TabPanelITem>

          <TabPanelITem
            title='Customer Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.customerCode ? true : false}
          >
            <ScrollView>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem>

          <TabPanelITem
            title='Supplier Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.supplierCode ? true : false}
          >
            <ScrollView>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
