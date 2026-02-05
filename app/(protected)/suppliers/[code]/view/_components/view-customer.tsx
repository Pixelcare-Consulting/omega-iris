'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getBpByCode } from '@/actions/business-partner'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import SupplierOverviewTab from './_tabs/supplier-overview-tab'
import SupplierContactTab from './_tabs/supplier-contact-tab'
import { useContacts } from '@/hooks/safe-actions/contacts'
import { useAddresses } from '@/hooks/safe-actions/address'
import SupplierAddressTab from './_tabs/supplier-address-tab'
import CanView from '@/components/acl/can-view'

type ViewSupplierProps = {
  supplier: NonNullable<Awaited<ReturnType<typeof getBpByCode>>>
}

export default function ViewSupplier({ supplier }: ViewSupplierProps) {
  const router = useRouter()

  const contacts = useContacts(supplier?.CardCode)
  const addresses = useAddresses(supplier?.CardCode)

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Supplier Details' description='View the comprehensive details of this supplier.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/suppliers')}
          />
        </Item>
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <SupplierOverviewTab supplier={supplier} />
          </TabPanelITem>

          <TabPanelITem title='Contacts'>
            <SupplierContactTab contacts={contacts} />
          </TabPanelITem>

          <TabPanelITem title='Addresses'>
            <SupplierAddressTab addresses={addresses} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
