'use client'

import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import Toolbar from 'devextreme-react/toolbar'
import { useSession } from 'next-auth/react'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { usePisByWarehouseCode } from '@/hooks/safe-actions/project-individual'

type WarehouseProjectTabProps = {
  projects: ReturnType<typeof usePisByWarehouseCode>
}

export default function WarehouseProjectTab({ projects }: WarehouseProjectTabProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-warehouse-project'
  const DATAGRID_UNIQUE_KEY = 'warehouse-projects'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (projects.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [projects.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5 px-4'>
        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={projects.data}
          isLoading={projects.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          dataGridStore={dataGridStore}
        >
          <Column dataField='code' minWidth={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column dataField='projectGroup.name' dataType='string' caption='Group' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          {!isBusinessPartner && (
            <Column
              dataField='userSalesCloser'
              dataType='string'
              caption='Sales Closer'
              calculateCellValue={(rowData) => [rowData.userSalesCloser?.fname, rowData.userSalesCloser?.lname].filter(Boolean).join(' ')}
            />
          )}

          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />
        </CommonDataGrid>
      </div>
    </div>
  )
}
