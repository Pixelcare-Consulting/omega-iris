'use client'

import { Dispatch, Ref, SetStateAction, useCallback, useRef, useState } from 'react'
import { Workbook } from 'exceljs'
import { exportDataGrid } from 'devextreme/common/export/excel'
import { saveAs } from 'file-saver-es'
import { format } from 'date-fns'
import DataGrid, {
  Column,
  DataGridTypes,
  DataGridRef,
  MasterDetail,
  Export,
  Toolbar,
  Item,
  Pager,
  Paging,
} from 'devextreme-react/data-grid'
import { Popup } from 'devextreme-react/popup'

import { FileAttachmentError } from '@/types/common'
import { DATAGRID_DEFAULT_PAGE_SIZE, DATAGRID_PAGE_SIZES, DEFAULT_COLUMN_MIN_WIDTH } from '@/constants/devextreme'
import { CellRange } from 'devextreme/excel_exporter.types'

type FileUploadErrorDataGridProps = {
  title?: string
  description?: string
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  data: FileAttachmentError[]
  dataGridRef: Ref<DataGridRef>
  children?: React.ReactNode
}

export default function FileUploadErrorDataGrid({
  title,
  description,
  isOpen,
  setIsOpen,
  data,
  dataGridRef,
  children,
}: FileUploadErrorDataGridProps) {
  const DEFAULT_TITLE = 'File Upload Error'
  const DEFAULT_DESCRIPTION = 'There was an error encountered while uploading files.'

  const masterRowsRef = useRef<Record<string, any>>([])

  const DetailTemplate = useCallback((props: DataGridTypes.MasterDetailTemplateData) => {
    const data = props?.data?.data
    const dataSource = data?.entries || []

    return (
      <DataGrid
        dataSource={dataSource}
        showBorders
        showColumnLines
        showRowLines
        wordWrapEnabled
        columnAutoWidth={false}
        columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
      >
        <Column dataField='message' dataType='string' caption='Message' alignment='center' />
        <Pager visible={true} showInfo displayMode='full' showNavigationButtons />
        <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />
      </DataGrid>
    )
  }, [])

  const onExporting = (e: DataGridTypes.ExportingEvent) => {
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Main sheet')

    exportDataGrid({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
      customizeCell: ({ gridCell, excelCell }) => {
        if (gridCell?.column?.dataField === 'rowNumber' && gridCell?.rowType === 'data') {
          masterRowsRef.current.push({
            rowIndex: excelCell.fullAddress.row + 1,
            data: gridCell.data,
          })
        }
      },
    })
      .then((cellRange: CellRange) => {
        const masterRows = masterRowsRef.current

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
        const detailFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
        const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }

        const borderStyle = { style: 'thin', color: { argb: 'FF7E7E7E' } }
        let offset = 0
        const cellRangeFromColumn = cellRange?.from?.column ?? 0

        //* set main grid first column
        worksheet.getColumn(cellRangeFromColumn).width = 20

        //* set master detail column widths here
        const detailColStart = cellRangeFromColumn + 1
        worksheet.getColumn(detailColStart).width = 60 //* 'Message'

        const insertRow = (index: number, offset: number, outlineLevel: number) => {
          const currentIndex = index + offset

          const row = worksheet.insertRow(currentIndex, [], 'n')

          for (let j = worksheet.rowCount + 1; j > currentIndex; j--) {
            worksheet.getRow(j).outlineLevel = worksheet.getRow(j - 1).outlineLevel
          }

          row.outlineLevel = outlineLevel

          return row
        }

        for (let i = 0; i < masterRows.length; i++) {
          const rowNumber = masterRows[i].rowIndex + i
          const entriesData = masterRows[i].data?.entries || []

          //* Insert title row
          let row = insertRow(rowNumber, offset++, 2)
          const columnIndex = cellRangeFromColumn + 1

          Object.assign(row.getCell(columnIndex), {
            value: `# ${masterRows[i].data.rowNumber} Errors`,
            fill: titleFill,
          })

          //* Merge title row
          worksheet.mergeCells(row.number, columnIndex, row.number, 3)

          //* Insert header row
          const columns = ['Message']
          row = insertRow(rowNumber, offset++, 2)

          columns.forEach((col, cIndex) => {
            Object.assign(row.getCell(columnIndex + cIndex), {
              value: col,
              font: { bold: true },
              fill: headerFill,
              border: {
                bottom: borderStyle,
                left: borderStyle,
                right: borderStyle,
                top: borderStyle,
              },
            })
          })

          //* Insert each detail row
          entriesData.forEach((entry: any) => {
            row = insertRow(rowNumber, offset++, 2)

            const rowValues = [entry.message]

            rowValues.forEach((cellValue, cIndex) => {
              Object.assign(row.getCell(columnIndex + cIndex), {
                value: cellValue,
                fill: detailFill,
                border: {
                  bottom: borderStyle,
                  left: borderStyle,
                  right: borderStyle,
                  top: borderStyle,
                },
              })
            })
          })

          offset--
        }
      })
      .then(() => {
        workbook.xlsx.writeBuffer().then((buffer) => {
          saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `FILE-UPLOAD-ERROR-${format(new Date(), 'MM-dd-yyyy')}.xlsx`)
        })
      })
  }

  return (
    <Popup visible={isOpen} dragEnabled={false} maxHeight={700} maxWidth={700} onHiding={() => setIsOpen(false)}>
      <div className='h-full w-full'>
        <DataGrid
          ref={dataGridRef}
          dataSource={data}
          keyExpr='rowNumber'
          showBorders
          hoverStateEnabled
          width='100%'
          height='100%'
          onExporting={onExporting}
          wordWrapEnabled
          columnAutoWidth={false}
          columnMinWidth={DEFAULT_COLUMN_MIN_WIDTH}
        >
          <Column dataField='rowNumber' dataType='number' caption='#' alignment='center' />
          <Column dataField='fileName' dataType='string' caption='File Name' alignment='center' />
          {children}
          <Export enabled formats={['xlsx']} />

          <Pager
            visible={true}
            allowedPageSizes={DATAGRID_PAGE_SIZES}
            showInfo
            displayMode='full'
            showPageSizeSelector
            showNavigationButtons
          />
          <Paging defaultPageSize={DATAGRID_DEFAULT_PAGE_SIZE} />

          <Toolbar>
            <Item
              visible
              location='before'
              render={() => (
                <div className='max-w-md'>
                  <h2 className='text-lg font-semibold'>{title || DEFAULT_TITLE}</h2>
                  <p className='text-sm text-slate-400'>{description || DEFAULT_DESCRIPTION}</p>
                </div>
              )}
            />
            <Item visible name='exportButton' location='after' locateInMenu='auto' />
          </Toolbar>

          <MasterDetail enabled component={DetailTemplate} />
        </DataGrid>
      </div>
    </Popup>
  )
}
