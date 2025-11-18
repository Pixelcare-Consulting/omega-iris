'use client'

import { getProjectIndividualsByGroupCode } from '@/actions/project-individual'
import DataGrid, {
  Column,
  FilterRow,
  DataGridTypes,
  Pager,
  Paging,
  HeaderFilter,
  Sorting,
  Scrolling,
  ColumnChooser,
  FilterPanel,
  Grouping,
  GroupPanel,
  Export,
  StateStoring,
  DataGridRef,
  Selection,
  ColumnFixing,
  LoadPanel,
} from 'devextreme-react/data-grid'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import Toolbar from 'devextreme-react/toolbar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES } from '@/constants/devextreme'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import { cn } from '@/utils'

type ProjectGroupProjectTableProps = {
  groupCode: number
  projects: { data: NonNullable<Awaited<ReturnType<typeof getProjectIndividualsByGroupCode>>>; isLoading?: boolean }
}
type DataSource = Awaited<ReturnType<typeof getProjectIndividualsByGroupCode>>

export default function ProjectGroupProjectTable({ projects }: ProjectGroupProjectTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-group-project'
  const DATAGRID_UNIQUE_KEY = 'project-group-projects'

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

  const statusCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const isActive = data.isActive

    return (
      <div className={cn('flex items-center gap-1.5', isActive ? 'text-green-500' : 'text-red-500')}>
        <div className={cn('size-2 rounded-full', isActive ? 'bg-green-500' : 'bg-red-500')} />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    )
  }, [])

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const code = e.data?.code
    if (!code) return
    router.push(`/project/individuals/${code}/view`)
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

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <DataGrid
          ref={dataGridRef}
          dataSource={projects.data}
          keyExpr='id'
          showBorders
          columnHidingEnabled={dataGridStore.columnHidingEnabled}
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          height='100%'
          width='100%'
          onRowClick={handleView}
          onRowPrepared={(e) => e.rowElement.classList.add('cursor-pointer')}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column dataField='projectGroup.name' dataType='string' caption='Group' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            cellRender={statusCellRender}
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <FilterRow visible={dataGridStore.showFilterRow} />
          <HeaderFilter visible={dataGridStore.showHeaderFilter} allowSearch />
          <FilterPanel visible={dataGridStore.showFilterBuilderPanel} />
          <Grouping contextMenuEnabled={dataGridStore.showGroupPanel} />
          <GroupPanel visible={dataGridStore.showGroupPanel} />
          <ColumnFixing enabled />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnChooser mode='select' allowSearch width={300} />
          <Export formats={['pdf', 'xlsx']} />
          <LoadPanel enabled={projects.isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />

          <StateStoring enabled={dataGridStore.enableStateStoring} type='localStorage' storageKey={DATAGRID_STORAGE_KEY} />

          <Pager
            visible={true}
            allowedPageSizes={DATAGRID_PAGE_SIZES}
            showInfo
            displayMode='full'
            showPageSizeSelector
            showNavigationButtons
          />
          <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
        </DataGrid>
      </PageContentWrapper>
    </>
  )
}
