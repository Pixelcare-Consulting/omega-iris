'use client'

import { getUsers } from '@/actions/users'
import DataGrid, {
  Column,
  FilterRow,
  DataGridTypes,
  Pager,
  Paging,
  LoadPanel,
  HeaderFilter,
  Sorting,
  Scrolling,
  ColumnChooser,
  SearchPanel,
  FilterPanel,
  Grouping,
  GroupPanel,
  RowDragging,
  Selection,
  Export,
  StateStoring,
} from 'devextreme-react/data-grid'
import ScrollView from 'devextreme-react/scroll-view'

import { createRandomUser } from '@/utils/faker'
import { useState } from 'react'
import { cn } from '@/utils'

type DataSource = ReturnType<typeof createRandomUser>[]

function DataGridExample() {
  const RANDOM_USERS = Array.from({ length: 100 }).map(() => createRandomUser())

  const [showFilterRow, setShowFilterRow] = useState(true)
  const [showHeaderFilter, setShowHeaderFilter] = useState(true)
  const [showFilterBuilderPanel, setShowFilterBuilderPanel] = useState(true)
  const [showSearchPanel, setShowSearchPanel] = useState(true)
  const [showGroupPanel, setShowGroupPanel] = useState(true)

  const [enableGroupingContextMenu, setEnableGroupingContextMenu] = useState(true)
  const [enableExport, setEnableExport] = useState(false)

  const [allowColumnReordering, setAllowColumnReordering] = useState(true)
  const [allowColumnResizing, setAllowColumnResizing] = useState(true)
  const [allowReordering, setAllowReordering] = useState(true)

  const fullNameCellRender = (e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    return `${data.fname} ${data.lname}`
  }

  const statusCellRender = (e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const isActive = data.isActive

    return (
      <div className={cn('flex items-center gap-1.5', isActive ? 'text-green-500' : 'text-red-500')}>
        <div className={cn('size-2.5 rounded-full', isActive ? 'bg-green-500' : 'bg-red-500')} />
        <span>{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    )
  }

  return (
    <div className='flex h-[100vh] items-center justify-center'>
      <div className='w-[1240px]'>
        <DataGrid
          dataSource={RANDOM_USERS}
          keyExpr='id'
          showBorders
          // showColumnLines
          // showRowLines  //* default to true
          // rowAlternationEnabled
          columnHidingEnabled
          hoverStateEnabled
          allowColumnReordering={allowColumnReordering}
          allowColumnResizing={allowColumnResizing}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' />
          <Column dataField='username' dataType='string' />
          <Column dataField='fullName' dataType='string' caption='Full Name' cellRender={fullNameCellRender} />
          <Column dataField='email' dataType='string' caption='Email Address' />
          <Column dataField='role.name' dataType='string' caption='Role' />
          <Column dataField='isActive' dataType='string' caption='Status' cellRender={statusCellRender} />
          <Column dataField='location' dataType='string' />
          <Column dataField='lastIpAddress' dataType='string' caption='Last IP Address' />
          <Column dataField='lastSignin' dataType='string' caption='Last Signin' />

          {/* //* apply filter onClick */}
          <SearchPanel visible={showSearchPanel} />
          <FilterRow visible={showFilterRow} />
          <HeaderFilter visible={showHeaderFilter} allowSearch />
          <Sorting mode='multiple' />
          <Scrolling mode='standard' />
          <ColumnChooser enabled mode='select' allowSearch />
          <FilterPanel visible={showFilterBuilderPanel} />
          <Grouping contextMenuEnabled={enableGroupingContextMenu} />
          <GroupPanel visible={showGroupPanel} />
          <Selection mode='multiple' />
          <Export enabled={enableExport} formats={['pdf', 'xlsx']} />

          <StateStoring enabled={true} type='localStorage' storageKey='storage' />

          <RowDragging
            allowReordering={allowReordering}
            //   onReorder={onReorder}
            showDragIcons
          />

          <Pager
            visible={true}
            allowedPageSizes={[5, 10, 25, 50, 75, 100]}
            showInfo
            displayMode='full'
            showPageSizeSelector
            showNavigationButtons
          />
          <Paging defaultPageSize={10} />
        </DataGrid>
      </div>
    </div>
  )
}

export default DataGridExample
