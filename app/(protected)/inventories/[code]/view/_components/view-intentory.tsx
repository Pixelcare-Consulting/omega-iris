'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getInventoryByCode } from '@/actions/inventory'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import InvetoryOverviewTab from './_tabs/inventory-overview-tab'

type ViewInventoryProps = {
  inventory: NonNullable<Awaited<ReturnType<typeof getInventoryByCode>>>
}

export default function ViewInventory({ inventory }: ViewInventoryProps) {
  const router = useRouter()

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Inventory Details' description='View the comprehensive details of this inventory item.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/inventories')}
          />
        </Item>

        <Item
          location='after'
          locateInMenu='always'
          widget='dxButton'
          options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/inventories/add`) }}
        />

        <Item
          location='after'
          locateInMenu='always'
          widget='dxButton'
          options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/inventories/${inventory.code}`) }}
        />
      </PageHeader>

      <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <InvetoryOverviewTab inventory={inventory} />
          </TabPanelITem>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
