'use client'

import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { useRouter } from 'nextjs-toploader/app'
import { Tooltip } from 'devextreme-react/tooltip'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'

import { getWarehouseByCode } from '@/actions/warehouse'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import WarehouseOverviewTab from './_tabs/warehouse-overview-tab'
import { useWarehouseSubLevelCodes } from '@/hooks/safe-actions/warehouse-sublevel-codes'
import { useWarehouseBinLocations } from '@/hooks/safe-actions/warehouse-bin-location'
import WarehouseBinLocationTab from './_tabs/warehouse-bin-location-tab'
import { useBatchesMasterByWarehouseCode } from '@/hooks/safe-actions/batches'
import WarehouseBatchTab from './_tabs/warehouse-batch-tab'
import CanView from '@/components/acl/can-view'

type ViewWarehouseProps = {
  warehouse: NonNullable<Awaited<ReturnType<typeof getWarehouseByCode>>>
}

export default function ViewWarehouse({ warehouse }: ViewWarehouseProps) {
  const router = useRouter()

  const isSynced = warehouse.syncStatus === 'synced'

  const binLocations = useWarehouseBinLocations(warehouse.WarehouseCode)
  const sublevel1Codes = useWarehouseSubLevelCodes(warehouse.EnableBinLocations ? 1 : -1)
  const sublevel2Codes = useWarehouseSubLevelCodes(warehouse.EnableBinLocations ? 2 : -1)
  const sublevel3Codes = useWarehouseSubLevelCodes(warehouse.EnableBinLocations ? 3 : -1)
  const sublevel4Codes = useWarehouseSubLevelCodes(warehouse.EnableBinLocations ? 4 : -1)
  const batches = useBatchesMasterByWarehouseCode(warehouse.WarehouseCode, isSynced)

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title='Warehouse Details' description='View the comprehensive details of this warehouse.'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#back-button' contentRender={() => 'Back'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Button
            id='back-button'
            text='Back'
            icon='arrowleft'
            stylingMode='outlined'
            type='default'
            onClick={() => router.push('/warehouses')}
          />
        </Item>

        <CanView subject='p-warehouses' action='create'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/warehouses/add`) }}
          />
        </CanView>

        <CanView subject='p-warehouses' action='edit'>
          <Item
            location='after'
            locateInMenu='always'
            widget='dxButton'
            options={{ text: 'Edit', icon: 'edit', onClick: () => router.push(`/warehouses/${warehouse.code}`) }}
          />
        </CanView>
      </PageHeader>

      <PageContentWrapper className='h-[calc(100vh_-_180px)]'>
        <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
          <TabPanelITem title='Overview'>
            <WarehouseOverviewTab warehouse={warehouse} />
          </TabPanelITem>

          <CanView subject='p-warehouses-bin-locations' action='view'>
            <TabPanelITem title='Bin Locations' visible={warehouse.EnableBinLocations}>
              <WarehouseBinLocationTab
                warehouseCode={warehouse.WarehouseCode}
                warehouseName={warehouse.WarehouseName}
                warehouseSyncStatus={warehouse.syncStatus}
                binLocations={binLocations}
                sublevel1Codes={sublevel1Codes}
                sublevel2Codes={sublevel2Codes}
                sublevel3Codes={sublevel3Codes}
                sublevel4Codes={sublevel4Codes}
              />
            </TabPanelITem>
          </CanView>

          <CanView subject='p-warehouses' action='view batches'>
            <TabPanelITem title='Batches' visible={warehouse.EnableBinLocations}>
              <WarehouseBatchTab warehouseCode={warehouse.WarehouseCode} isSynced={isSynced} batches={batches} />
            </TabPanelITem>
          </CanView>
        </TabPanel>
      </PageContentWrapper>
    </div>
  )
}
