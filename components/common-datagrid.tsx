'use client'

import DataGrid, {
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
import React, { Ref } from 'react'

import { DataGridStore } from '@/hooks/use-dx-datagrid'
import { handleOnAdaptiveDetailRowPreparing, handleOnRowPrepared } from '@/utils/devextreme'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_COLUMN_MIN_WIDTH } from '@/constants/devextreme'

type DataGridCallbacks = {
  onRowClick?: (e: DataGridTypes.RowClickEvent) => void
  onSelectionChanged?: (e: DataGridTypes.SelectionChangedEvent) => void
  onRowUpdated?: (e: DataGridTypes.RowUpdatedEvent<any, any>) => void
}

type CommonDataGridProps<T extends Record<string, any>> = {
  dataGridRef: Ref<DataGridRef>
  data: T
  isLoading?: boolean
  children: React.ReactNode
  callbacks?: DataGridCallbacks
  storageKey: string
  keyExpr?: string
  selectedRowKeys?: any[]
  isSelectionEnable?: boolean
  dataGridStore: Partial<DataGridStore>
}

//? In Devextreme you can implemenet remote pagination only and the rest like pagination, sorting, filtering, grouping, etc. is in client side.
export default function CommonDataGrid<T extends Record<string, any>>({
  dataGridRef,
  data,
  isLoading,
  callbacks,
  children,
  storageKey,
  keyExpr = 'id',
  selectedRowKeys,
  isSelectionEnable,
  dataGridStore,
}: CommonDataGridProps<T>) {
  return (
    <DataGrid
      ref={dataGridRef}
      dataSource={data}
      keyExpr={keyExpr}
      showBorders
      columnHidingEnabled={dataGridStore.columnHidingEnabled}
      hoverStateEnabled
      allowColumnReordering
      // allowColumnResizing
      width='100%'
      height='100%'
      selectedRowKeys={selectedRowKeys ?? []}
      onRowClick={callbacks?.onRowClick}
      onSelectionChanged={callbacks?.onSelectionChanged}
      onRowPrepared={handleOnRowPrepared}
      onRowUpdated={callbacks?.onRowUpdated}
      onAdaptiveDetailRowPreparing={handleOnAdaptiveDetailRowPreparing}
      wordWrapEnabled
      columnAutoWidth={false}
      columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
    >
      {children}

      <FilterRow visible={dataGridStore.showFilterRow} />
      <HeaderFilter visible={dataGridStore.showHeaderFilter} allowSearch />
      <FilterPanel visible={dataGridStore.showFilterBuilderPanel} />
      <Grouping contextMenuEnabled={dataGridStore.showGroupPanel} />
      <GroupPanel visible={dataGridStore.showGroupPanel} />
      <ColumnFixing enabled />
      <Sorting mode='multiple' />
      <Scrolling mode='infinite' rowRenderingMode='standard' columnRenderingMode='standard' />
      <ColumnChooser mode='select' allowSearch width={300} />
      <Export formats={['xlsx']} />
      {isSelectionEnable && <Selection mode='multiple' />}
      <LoadPanel enabled={isLoading} shadingColor='rgb(241, 245, 249)' showIndicator showPane shading />

      <StateStoring enabled={dataGridStore.enableStateStoring} type='localStorage' storageKey={storageKey} />

      <Pager visible={true} allowedPageSizes={DATAGRID_PAGE_SIZES} showInfo displayMode='full' showPageSizeSelector showNavigationButtons />
      <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
    </DataGrid>
  )
}
