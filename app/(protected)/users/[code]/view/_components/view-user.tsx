'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import ScrollView from 'devextreme-react/scroll-view'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'
import { useSession } from 'next-auth/react'

import { getUserByCode } from '@/actions/users'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import UserOverviewTab from './_tabs/user-overview-tab'
import UnderDevelopment from '@/app/under-development'
import CanView from '@/components/acl/can-view'
import { usePiCustomerByUserCode } from '@/hooks/safe-actions/project-individual-customer'
import { usePis } from '@/hooks/safe-actions/project-individual'
import UserCustomerProjectIndividualTab from './_tabs/user-customer-project-individual-tab'

type ViewUserProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ViewUser({ user }: ViewUserProps) {
  const router = useRouter()

  const projects = usePis()
  const piCustomers = usePiCustomerByUserCode(user.role.key === 'business-partner' ? user.code : undefined)

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

        <CanView subject='p-users' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/users/add`) }}
          />
        </CanView>

        <CanView subject='p-users' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/users/${user.code}`) }}
          />
        </CanView>
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <UserOverviewTab user={user} />
          </TabPanelITem>

          {/* <TabPanelITem title='Customer Projects' visible={user.role.key === 'business-partner' && user?.customerCode ? true : false}>
            <UserCustomerProjectIndividualTab userCode={user.code} projects={projects} piCustomers={piCustomers} />
          </TabPanelITem> */}

          {/* <TabPanelITem
            title='Customer Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.customerCode ? true : false}
          >
            <ScrollView>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem> */}

          {/* <TabPanelITem
            title='Supplier Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.supplierCode ? true : false}
          >
            <ScrollView>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem> */}
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
