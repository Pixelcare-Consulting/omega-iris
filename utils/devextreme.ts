import { Workbook } from 'exceljs'
import { saveAs } from 'file-saver-es'
import { exportDataGrid } from 'devextreme-react/common/export/excel'
import { format } from 'date-fns'
import dxDataGrid from 'devextreme/ui/data_grid'
import { DataGridTypes } from 'devextreme-react/cjs/data-grid'

//* devextreme helpers functions

export function exportToExcel(fileName: string, component?: dxDataGrid<any, any> | null, selectedRowsOnly = false) {
  if (!component) return

  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9-]/g, '-')
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('Main sheet')

  exportDataGrid({
    component: component,
    worksheet,
    autoFilterEnabled: true,
    selectedRowsOnly,
  }).then(() => {
    workbook.xlsx.writeBuffer().then((buffer) => {
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${normalizedFileName}-${format(new Date(), 'MM-dd-yyyy')}.xlsx`)
    })
  })
}

export function handleOnRowPrepared(e: DataGridTypes.RowPreparedEvent) {
  const rowType = e.rowType
  if (rowType === 'data') e.rowElement.classList.add('cursor-pointer')
}
