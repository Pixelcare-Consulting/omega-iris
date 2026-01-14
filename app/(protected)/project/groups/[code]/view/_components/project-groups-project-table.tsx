'use client'

import { getPisByGroupCode } from '@/actions/project-individual'
import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import Toolbar from 'devextreme-react/toolbar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'

type ProjectGroupProjectTableProps = {
  groupCode: number
  projects: { data: NonNullable<Awaited<ReturnType<typeof getPisByGroupCode>>>; isLoading?: boolean }
}

export default function ProjectGroupProjectTable({ projects }: ProjectGroupProjectTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group-project'
  const DATAGRID_UNIQUE_KEY = 'project-group-projects'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return

    router.push(`/project/individuals/${data.code}/view`)
  }, [])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (projects.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [projects.isLoading, dataGridRef.current])

  return (
    <>
      <Toolbar className='mt-5'>
        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      <PageContentWrapper className='h-[calc(100%_-_68px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={projects.data}
          isLoading={projects.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          dataGridStore={dataGridStore}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <Button icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>
    </>
  )
}
