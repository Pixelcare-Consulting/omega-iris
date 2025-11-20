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

export function handleOnAdaptiveDetailRowPreparing(e: DataGridTypes.AdaptiveDetailRowPreparingEvent) {
  e.formOptions.colCount = 4
}

//* common devextreme render functions
export function userItemRender(params: any) {
  const fullName = `${params?.fname} ${params?.lname}`

  return (
    <div className='flex w-full items-center justify-between'>
      <div className='flex w-[8%] flex-col justify-center'>
        <span className='truncate font-semibold' title={fullName}>
          {fullName}
        </span>
        <span className='truncate text-xs text-slate-400' title={params?.email}>
          {params?.email}
        </span>
      </div>

      <div className='text-xs font-semibold' title={params?.code}>
        #{params?.code}
      </div>
    </div>
  )
}

export function commonItemRender({
  title,
  description,
  value,
  valuePrefix,
}: {
  title: string
  description: string
  value: string | number
  valuePrefix?: string
}) {
  return (
    <div className='flex w-full items-center justify-between'>
      <div className='flex w-[8%] flex-col justify-center'>
        <span className='truncate font-semibold' title={title}>
          {title}
        </span>
        <span className='truncate text-xs text-slate-400' title={description}>
          {description}
        </span>
      </div>

      <div className='text-xs font-semibold' title={String(value)}>
        {valuePrefix ? `${valuePrefix}${value}` : value}
      </div>
    </div>
  )
}
