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
  const data = e.data
  const rowElement = e.rowElement

  if (rowType === 'data' && rowElement) {
    e.rowElement.classList.add('cursor-pointer')

    if (data?.deletedAt && data?.deletedBy) {
      const columnElement = Array.from(rowElement.children) as HTMLElement[]

      //* style column elements except the action columns
      columnElement.forEach((cEl) => {
        //* identify the action column by the class name that contains dx-command
        if (!cEl.className.includes('dx-command')) {
          cEl.style.textDecoration = 'line-through'
          cEl.style.textDecorationColor = 'red'
          cEl.style.textDecorationThickness = '2px'
          cEl.style.opacity = '0.6'
        }
      })
    }
  }
}

export function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
  const column = e.column as any
  const data = e.data
  const cellElement = e.cellElement
  const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
  const rowType = e.rowType

  if (rowType === 'data') {
    //* condition when column type is selection
    if (column?.type === 'selection') {
      if (data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced') {
        if (checkbox) checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy
      }
    }
  }
}

export function hideActionButton(isHide: boolean) {
  if (isHide) return false
  return true
}

export function showActionButton(isShow: boolean) {
  if (isShow) return true
  return false
}

export function handleOnAdaptiveDetailRowPreparing(e: DataGridTypes.AdaptiveDetailRowPreparingEvent) {
  e.formOptions.colCount = 4
}

//* common devextreme render functions
export function userItemRender(params: any) {
  const fullName = `${params?.fname} ${params?.lname}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'start',
          width: '80%',
          fontWeight: 600,
        }}
      >
        <span
          style={{ display: 'inline-block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={fullName}
        >
          {fullName}
        </span>
        <span
          style={{
            display: 'inline-block',
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: '#94A3B8',
            fontSize: 12,
          }}
          title={params?.email}
        >
          {params?.email}
        </span>
      </div>

      <div style={{ width: '20%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }} title={String(params?.code)}>
        <div className='text-xs font-semibold'>#{params?.code}</div>
      </div>
    </div>
  )
}

export function commonItemRender({
  title,
  description,
  value,
  valuePrefix,
  otherItems,
}: {
  title: string
  description?: string
  value?: string | number
  valuePrefix?: string
  otherItems?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div
        style={{
          display: 'flex',
          gap: 2,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'start',
          width: '80%',
          fontWeight: 600,
        }}
      >
        <span
          style={{ display: 'inline-block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={title}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              display: 'inline-block',
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#94A3B8',
              fontSize: 12,
            }}
            title={description}
          >
            {description}
          </span>
        )}

        {otherItems}
      </div>

      {value && (
        <div
          style={{ width: '20%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', columnGap: 4 }}
          title={String(value)}
        >
          <div className='text-xs font-semibold'>{valuePrefix ? `${valuePrefix}${value}` : value}</div>
        </div>
      )}
    </div>
  )
}
