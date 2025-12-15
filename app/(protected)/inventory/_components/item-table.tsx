'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { saveAs } from 'file-saver-es'
import { Anchor, Workbook } from 'exceljs'
import dxDataGrid from 'devextreme/ui/data_grid'
import { format } from 'date-fns'
import { parseExcelFile } from '@/utils/xlsx'
import ImportErrorDataGrid from '@/components/import-error-datagrid'
import { ImportError } from '@/types/common'

import { deleteItem, getItems, importItems } from '@/actions/item'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { exportDataGrid } from 'devextreme/common/export/excel'
import CommonDataGrid from '@/components/common-datagrid'

type ItemTableProps = { items: Awaited<ReturnType<typeof getItems>> }
type DataSource = Awaited<ReturnType<typeof getItems>>

export default function ItemTable({ items }: ItemTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-inventory'
  const DATAGRID_UNIQUE_KEY = 'inventory'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleteItem)
  const importData = useAction(importItems)

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

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/inventory/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/inventory/${code}`)
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

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    try {
      const headers: string[] = ['MFG_P/N', 'Manufacturer', 'Description', 'Notes', 'Active']

      //* parse excel file
      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row }))

      const response = await importData.executeAsync({ data: toImportData })
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)
      router.refresh()

      if (result?.errors && result?.errors.length > 0) {
        setShowImportError(true)
        setImportErrors(result?.errors || [])
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to import file')
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Inventory' description='Manage and track your inventory effectively' isLoading={importData.isExecuting}>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={importData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{ text: 'Add Inventory', onClick: () => router.push('/inventory/add') }}
          customs={{ exportToExcel }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={items} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='thumbnail' minWidth={140} caption='Thumbnail' cellRender={thumbnailCellRender} />
          <Column dataField='manufacturer' dataType='string' caption='Manufacturer' />
          <Column dataField='manufacturerPartNumber' dataType='string' caption='MFG P/N' />
          <Column dataField='description' dataType='string' caption='Description' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column dataField='notes' dataType='string' caption='Notes' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
            <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' hint='Edit' />
            <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' hint='Delete' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this inventory item named "${rowData?.description}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowConfirmation(false)}
      />

      <ImportErrorDataGrid
        isOpen={showImportError}
        setIsOpen={setShowImportError}
        data={importErrors}
        dataGridRef={importErrorDataGridRef}
      />
    </div>
  )
}
