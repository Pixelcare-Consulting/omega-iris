'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'
import { useSession } from 'next-auth/react'

import { getUserByCode } from '@/actions/users'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import UserOverviewTab from './_tabs/user-overview-tab'
import UnderDevelopment from '@/components/under-development'
import CanView from '@/components/acl/can-view'
import { usePiCustomersByUserCode } from '@/hooks/safe-actions/project-individual-customer'
import { usePis, usePisBySalesCloser } from '@/hooks/safe-actions/project-individual'
import UserCustomerProjectIndividualTab from './_tabs/user-customer-project-individual-tab'
import { usePiPicsByUserCode } from '@/hooks/safe-actions/project-individual-pic'
import UserPicProjectIndividualTab from './_tabs/user-pic-project-individual-tab'
import UserPicProjectGroupTab from './_tabs/user-pic-project-group-tab'
import { usePgs } from '@/hooks/safe-actions/project-group'
import { usePgPicsByUserCode } from '@/hooks/safe-actions/project-group-pic'
import UserProjectsClosedTab from './_tabs/user-projects-closed-tab'

type ViewUserProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ViewUser({ user }: ViewUserProps) {
  const router = useRouter()

  const projects = usePis()
  const groups = usePgs()

  const piCustomers = usePiCustomersByUserCode(user.role.key === 'business-partner' ? user.code : undefined)
  const piPics = usePiPicsByUserCode(user.role.key !== 'business-partner' ? user.code : undefined)
  const pgPics = usePgPicsByUserCode(user.role.key !== 'business-partner' ? user.code : undefined)
  const pisClosed = usePisBySalesCloser(user.code)

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

      <PageContentWrapper className='h-[calc(100vh_-_180px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <UserOverviewTab user={user} />
          </TabPanelITem>

          <TabPanelITem title='Groups' visible={user.role.key !== 'business-partner' ? true : false}>
            <UserPicProjectGroupTab userCode={user.code} groups={groups} pgPics={pgPics} />
          </TabPanelITem>

          <TabPanelITem title='Projects' visible={user.role.key === 'business-partner' && user?.customerCode ? true : false}>
            <UserCustomerProjectIndividualTab userCode={user.code} projects={projects} piCustomers={piCustomers} />
          </TabPanelITem>

          <TabPanelITem title='Projects' visible={user.role.key !== 'business-partner' ? true : false}>
            <UserPicProjectIndividualTab userCode={user.code} projects={projects} piPics={piPics} />
          </TabPanelITem>

          <TabPanelITem title='Projects Closed' visible={user.role.key !== 'business-partner' ? true : false}>
            <UserProjectsClosedTab projectsClosed={pisClosed} />
          </TabPanelITem>

          {/* <TabPanelITem
            title='Customer Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.customerCode ? true : false}
          >
            <ScrollView useNative>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem> */}

          {/* <TabPanelITem
            title='Supplier Details'
            badge='SAP'
            visible={user.role.key === 'business-partner' && user?.supplierCode ? true : false}
          >
            <ScrollView useNative>
              <UnderDevelopment className='h-[60vh]' />
            </ScrollView>
          </TabPanelITem> */}
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
