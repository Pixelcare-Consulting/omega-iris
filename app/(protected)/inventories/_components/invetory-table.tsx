'use client'

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
  Button as DataGridButton,
  ColumnFixing,
} from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { saveAs } from 'file-saver-es'
import { Anchor, Workbook } from 'exceljs'
import dxDataGrid from 'devextreme/ui/data_grid'
import { format } from 'date-fns'

import { deleteInventory, getInventories } from '@/actions/inventory'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES } from '@/constants/devextreme'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { handleOnAdaptiveDetailRowPreparing, handleOnRowPrepared } from '@/utils/devextreme'
import { exportDataGrid } from 'devextreme/common/export/excel'

type InventoryTableProps = { inventories: Awaited<ReturnType<typeof getInventories>> }
type DataSource = Awaited<ReturnType<typeof getInventories>>

export default function InventoryTable({ inventories }: InventoryTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-inventory'
  const DATAGRID_UNIQUE_KEY = 'inventories'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleteInventory)

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

  const thumbnailCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const thumbnail = data.thumbnail

    return <img src={thumbnail || '/images/placeholder-img.jpg'} className='size-[60px]' />
  }, [])

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const code = e.data?.code
    if (!code) return
    router.push(`/inventories/${code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/inventories/${code}`)
  }, [])

  const handleDelete = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowConfirmation(true)
      setRowData(data)
    },
    [setShowConfirmation, setRowData]
  )

  const handleConfirm = useCallback((code?: number) => {
    if (!code) return

    setShowConfirmation(false)

    toast.promise(executeAsync({ code }), {
      loading: 'Deleting inventory...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete inventory!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }, [])

  function exportToExcel(fileName: string, component?: dxDataGrid<any, any> | null, selectedRowsOnly = false) {
    if (!component) return

    const normalizedFileName = fileName.replace(/[^a-zA-Z0-9-]/g, '-')
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Main sheet')

    exportDataGrid({
      component: component,
      worksheet,
      autoFilterEnabled: true,
      selectedRowsOnly,
      customizeCell: ({ gridCell, excelCell }) => {
        if (gridCell?.rowType === 'data') {
          if (gridCell?.column?.dataField === 'thumbnail') {
            excelCell.value = undefined

            const image = workbook.addImage({
              base64: gridCell.value,
              extension: 'png',
            })

            worksheet.getRow(excelCell.row).height = 60
            worksheet.getColumn(excelCell.col).width = 20
            worksheet.addImage(image, {
              tl: { col: excelCell.col - 1, row: excelCell.row - 1 } as Anchor,
              br: { col: excelCell.col, row: excelCell.row } as Anchor,
            })
          }
        }
      },
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${normalizedFileName}-${format(new Date(), 'MM-dd-yyyy')}.xlsx`)
      })
    })
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Inventories' description='Manage and track your inventories effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          addButton={{ text: 'Add Inventory', onClick: () => router.push('/inventories/add') }}
          customs={{ exportToExcel }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <DataGrid
          ref={dataGridRef}
          dataSource={inventories}
          keyExpr='id'
          showBorders
          columnHidingEnabled={dataGridStore.columnHidingEnabled}
          hoverStateEnabled
          allowColumnReordering
          allowColumnResizing
          height='100%'
          width='100%'
          onRowClick={handleView}
          onAdaptiveDetailRowPreparing={handleOnAdaptiveDetailRowPreparing}
          onRowPrepared={handleOnRowPrepared}
        >
          <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='thumbnail' caption='Thumbnail' cellRender={thumbnailCellRender} />
          <Column dataField='projectIndividual.name' dataType='string' caption='Project' />
          <Column
            dataField='customer'
            dataType='string'
            caption='Owner'
            calculateCellValue={(rowData) => `${rowData.user.fname} ${rowData.user.lname}`}
          />
          <Column dataField='partNumber' dataType='string' caption='Part Number' />
          <Column dataField='manufacturer' dataType='string' caption='Manufacturer' />
          <Column dataField='manufacturerPartNumber' dataType='string' caption='MFG P/N' />
          <Column dataField='description' dataType='string' caption='Description' />
          <Column dataField='Note' dataType='string' caption='Note' />
          <Column dataField='dateCode' dataType='string' caption='Date Code' />
          <Column dataField='countryOfOrigin' dataType='string' caption='Ctry Orig' />
          <Column dataField='lotCode' dataType='string' caption='Lot Code' />
          <Column dataField='siteLocation' dataType='string' caption='Site Location' />
          <Column dataField='palletNo' dataType='string' caption='Pallet No' />
          <Column dataField='subLocation1' dataType='string' caption='Sub Location' />
          <Column dataField='subLocation2' dataType='string' caption='Sub Location 2' />
          <Column dataField='subLocation3' dataType='string' caption='Sub Location 3' />
          <Column dataField='dateReceived' dataType='date' caption='Date Received' />
          <Column dataField='packagingType' dataType='string' caption='Packaging Type' />
          <Column dataField='spq' dataType='number' caption='SPQ' />
          <Column dataField='inProcess' dataType='number' caption='In Process/Pending' />
          <Column dataField='cost' dataType='number' caption='Cost' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />

          <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
          </Column>

          <FilterRow visible={dataGridStore.showFilterRow} />
          <HeaderFilter visible={dataGridStore.showHeaderFilter} allowSearch />
          <FilterPanel visible={dataGridStore.showFilterBuilderPanel} />
          <Grouping contextMenuEnabled={dataGridStore.showGroupPanel} />
          <GroupPanel visible={dataGridStore.showGroupPanel} />
          <ColumnFixing enabled />
          <Sorting mode='multiple' />
          <Scrolling mode='infinite' rowRenderingMode='virtual' />
          <ColumnChooser mode='select' allowSearch width={300} />
          <Export formats={['pdf', 'xlsx']} />
          <Selection mode='multiple' />
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

      <AlertDialog
        isOpen={showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this inventory item named "${rowData?.description}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />
    </div>
  )
}
