'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import Toolbar from 'devextreme-react/toolbar'
import { Anchor, Workbook } from 'exceljs'
import { exportDataGrid } from 'devextreme/common/export/excel'
import { saveAs } from 'file-saver-es'
import dxDataGrid from 'devextreme/ui/data_grid'
import Popup from 'devextreme-react/popup'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { deleteProjectItem, getProjecItems } from '@/actions/project-item'
import ProjectItemForm from './project-individual-item-form'
import { useProjecItemsClient } from '@/hooks/safe-actions/project-item'
import AlertDialog from '@/components/alert-dialog'
import ProjectIndividualItemView from './project-individual-item-view'

type ProjectIndividualItemTableProps = {
  projectCode: number
  projectName: string
  items: ReturnType<typeof useProjecItemsClient>
}
type DataSource = Awaited<ReturnType<typeof getProjecItems>>

export default function ProjectIndividualItemTable({ projectCode, projectName, items }: ProjectIndividualItemTableProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-pic'
  const DATAGRID_UNIQUE_KEY = 'project-individual-pics'

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const { executeAsync } = useAction(deleteProjectItem)
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

  const thumbnailCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const thumbnail = data.item.thumbnail

    return <img src={thumbnail || '/images/placeholder-img.jpg'} className='size-[60px]' />
  }, [])

  const handleAdd = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleView = useCallback((e: DataGridTypes.RowClickEvent) => {
    const rowType = e.rowType
    if (rowType !== 'data') return

    const code = e.data?.code
    if (!code) return
    setRowData(e.data)
    setIsViewMode(true)
  }, [])

  const handleEdit = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setIsOpen(true)
      setRowData(data)
    },
    [setIsOpen, setRowData]
  )

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
      loading: 'Deleting item...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete item!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            items.execute({ projectCode })
            handleClose()
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

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsOpen(false)
    setIsViewMode(false)
  }, [])

  const exportToExcel = useCallback((fileName: string, component?: dxDataGrid<any, any> | null, selectedRowsOnly = false) => {
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
  }, [])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (items.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [items.isLoading, dataGridRef.current])

  return (
    <>
      {!isViewMode ? (
        <div className='flex h-full w-full flex-col'>
          <Toolbar className='mt-5'>
            <CommonPageHeaderToolbarItems
              dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
              dataGridRef={dataGridRef}
              addButton={{
                text: 'Add Item',
                onClick: handleAdd,
              }}
              customs={{ exportToExcel }}
            />
          </Toolbar>

          <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
            <CommonDataGrid
              dataGridRef={dataGridRef}
              data={items.data}
              isLoading={items.isLoading}
              storageKey={DATAGRID_STORAGE_KEY}
              keyExpr='code'
              dataGridStore={dataGridStore}
              callbacks={{ onRowClick: handleView }}
            >
              <Column dataField='code' width={100} dataType='string' caption='ID' sortOrder='asc' />
              <Column dataField='item.thumbnail' width={140} caption='Thumbnail' cellRender={thumbnailCellRender} />
              <Column dataField='projectIndividual.name' dataType='string' caption='Project' />
              <Column dataField='item.manufacturer' dataType='string' caption='Manufacturer' />
              <Column dataField='item.manufacturerPartNumber' dataType='string' caption='MFG P/N' />
              <Column dataField='item.description' dataType='string' caption='Description' />
              <Column
                dataField='isActive'
                dataType='string'
                caption='Status'
                calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
              />
              <Column dataField='notes' dataType='string' caption='Notes' />

              <Column type='buttons' fixed fixedPosition='right' caption='Actions'>
                <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' />
                <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' />
              </Column>
            </CommonDataGrid>

            <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)}>
              <ProjectItemForm
                projectCode={projectCode}
                projectName={projectName}
                setIsOpen={setIsOpen}
                onClose={handleClose}
                items={items}
                item={rowData || null}
              />
            </Popup>

            <AlertDialog
              isOpen={showConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to delete this inventory item named "${rowData?.item.description}"?`}
              onConfirm={() => handleConfirm(rowData?.code)}
              onCancel={() => setShowConfirmation(false)}
            />
          </PageContentWrapper>
        </div>
      ) : rowData ? (
        <ProjectIndividualItemView data={rowData} onClose={handleClose} />
      ) : null}
    </>
  )
}
