'use client'

import { Column, DataGridRef } from 'devextreme-react/data-grid'
import { useEffect, useRef } from 'react'
import Toolbar from 'devextreme-react/toolbar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { useContacts } from '@/hooks/safe-actions/contacts'

type CustomerContactTabProps = {
  contacts: Awaited<ReturnType<typeof useContacts>>
}

export default function CustomerContactTab({ contacts }: CustomerContactTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-customer-contact'
  const DATAGRID_UNIQUE_KEY = 'customer-contacts'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore([
    'showFilterRow',
    'setShowFilterRow',
    'showHeaderFilter',
    'setShowHeaderFilter',
    'showFilterBuilderPanel',
    'setShowFilterBuilderPanel',
    'showGroupPanel',
    'setShowGroupPanel',
    'enableStateStoring',
    'columnHidingEnabled',
    'setColumnHidingEnabled',
    'showColumnChooser',
    'setShowColumnChooser',
  ])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (contacts.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [contacts.isLoading, dataGridRef.current])

  return (
    <>
      <Toolbar className='mt-5'>
        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={contacts.data}
          isLoading={contacts.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='id'
          dataGridStore={dataGridStore}
        >
          <Column dataField='ContactName' dataType='string' caption='Name' />
          <Column
            dataField='fullName'
            dataType='string'
            caption='Full Name'
            calculateCellValue={(rowData) => `${rowData?.FirstName || ''}${rowData?.LastName ? ` ${rowData?.LastName}` : ''}`}
          />
          <Column dataField='E_Mail' dataType='string' caption='Email' />
          <Column dataField='Title' dataType='string' caption='Title' />
          <Column dataField='Position' dataType='string' caption='Position' />
          <Column dataField='Phone1' dataType='string' caption='Tel 1' />
          <Column dataField='Phone2' dataType='string' caption='Tel 2' />
          <Column dataField='MobilePhone' dataType='string' caption='Mobile Phone' />
        </CommonDataGrid>
      </PageContentWrapper>
    </>
  )
}
