'use client'

import { Column, DataGridRef } from 'devextreme-react/data-grid'
import { useEffect, useRef } from 'react'
import Toolbar from 'devextreme-react/toolbar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { useAddresses } from '@/hooks/safe-actions/address'
import { ADDRESS_TYPE_MAP } from '@/schema/business-partner'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'

type CustomerAddressTabProps = {
  addresses: Awaited<ReturnType<typeof useAddresses>>
}

export default function CustomerAddressTab({ addresses }: CustomerAddressTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-customer-address'
  const DATAGRID_UNIQUE_KEY = 'customer-addresses'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (addresses.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [addresses.isLoading, dataGridRef.current])

  return (
    <>
      <Toolbar className='mt-5'>
        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={addresses.data}
          isLoading={addresses.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='id'
          dataGridStore={dataGridStore}
        >
          <Column dataField='AddressName' dataType='string' caption='Name' />
          <Column
            dataField='AddrType'
            dataType='string'
            caption='Type'
            calculateCellValue={(rowData) => ADDRESS_TYPE_MAP?.[rowData.AddrType] || ''}
          />
          <Column dataField='Street' dataType='string' minWidth={300} caption='Line 1' />
          <Column dataField='Address2' dataType='string' minWidth={300} caption='Line 2' />
          <Column dataField='Address3' dataType='string' minWidth={300} caption='Line 3' />
          <Column dataField='StreetNo' dataType='string' caption='Street No.' />
          <Column dataField='BuildingFloorRoom' dataType='string' caption='Building/Floor/Room' />
          <Column dataField='Block' dataType='string' caption='Block' />
          <Column dataField='City' dataType='string' caption='City' />
          <Column dataField='ZipCode' dataType='string' caption='Zip Code' />
          <Column dataField='County' dataType='string' caption='County' />
          <Column dataField='CountryName' dataType='string' caption='Country' />
          <Column dataField='StateName' dataType='string' caption='State' />
          <Column dataField='GlobalLocationNumber' dataType='string' caption='GLN' />
        </CommonDataGrid>
      </PageContentWrapper>
    </>
  )
}
