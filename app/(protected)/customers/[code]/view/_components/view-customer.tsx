'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getBpByCode } from '@/actions/business-partner'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import CustomerOverviewTab from './_tabs/customer-overview-tab'
import CustomerContactTab from './_tabs/customer-contact-tab'
import { useContacts } from '@/hooks/safe-actions/contacts'
import { useAddresses } from '@/hooks/safe-actions/address'
import CustomerAddressTab from './_tabs/customer-address-tab'
import CanView from '@/components/acl/can-view'

type ViewCustomerProps = {
  customer: NonNullable<Awaited<ReturnType<typeof getBpByCode>>>
}

export default function ViewCustomer({ customer }: ViewCustomerProps) {
  const router = useRouter()

  const contacts = useContacts(customer?.CardCode)
  const addresses = useAddresses(customer?.CardCode)

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Customer Details' description='View the comprehensive details of this customer.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/customers')}
          />
        </Item>

        <CanView subject='p-customers' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/customers/add`) }}
          />
        </CanView>

        {customer.syncStatus === 'pending' && (
          <CanView subject='p-customers' action='edit'>
            <Item
              location='after'
              locateInMenu='always'
              widget='dxButton'
              options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/customers/${customer.code}`) }}
            />
          </CanView>
        )}
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <CustomerOverviewTab customer={customer} />
          </TabPanelITem>

          <TabPanelITem title='Contacts'>
            <CustomerContactTab contacts={contacts} />
          </TabPanelITem>

          <TabPanelITem title='Addresses'>
            <CustomerAddressTab addresses={addresses} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
