'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton, Summary, TotalItem, GroupItem } from 'devextreme-react/data-grid'
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
import { useRouter } from 'next/navigation'
import ProgressBar from 'devextreme-react/progress-bar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { deleteProjectItem, getProjecItems, importProjectItems } from '@/actions/project-item'
import ProjectItemForm from '../project-individual-item-form'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import AlertDialog from '@/components/alert-dialog'
import ProjectIndividualItemView from '../project-individual-item-view'
import useUsers from '@/hooks/safe-actions/user'
import { useWarehouses } from '@/hooks/safe-actions/warehouse'
import useItems from '@/hooks/safe-actions/item'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { ImportSyncError, Stats } from '@/types/common'
import { parseExcelFile } from '@/utils/xlsx'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'

type ProjectIndividualItemTabProps = {
  projectCode: number
  projectName: string
  items: ReturnType<typeof useProjecItems>
}
type DataSource = Awaited<ReturnType<typeof getProjecItems>>

export default function ProjectIndividualItemTab({ projectCode, projectName, items }: ProjectIndividualItemTabProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-item'
  const DATAGRID_UNIQUE_KEY = 'project-individual-items'

  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, progress: 0, errors: [], status: 'processing' })

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showImportError, setShowImportError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])

  const users = useUsers()
  const itemMasters = useItems()

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleteProjectItem)
  const importData = useAction(importProjectItems)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const thumbnailCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const thumbnail = data.item.thumbnail

    return <img src={thumbnail || '/images/placeholder-img.jpg'} className='size-[60px]' />
  }, [])

  const dateReceivedByCalculatedCellValue = useCallback((rowData: DataSource[number]) => {
    const dateReceivedBy = rowData?.dateReceivedByUser
    const fullName = `${dateReceivedBy?.fname}${dateReceivedBy?.lname ? ` ${dateReceivedBy?.lname}` : ''}`
    if (!dateReceivedBy || !fullName) return ''
    return fullName
  }, [])

  const handleAdd = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleView = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setRowData(data)
      setIsViewMode(true)
    },
    [setRowData, setIsViewMode]
  )

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

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)

    try {
      const headers: string[] = [
        'MFG_P/N',
        'Part_Number',
        'Date_Code',
        'Country_Origin',
        'Lot_Code',
        'Pallet_No',
        'Packaging_Type',
        'SPQ',
        'Cost',
        'Available_To_Order',
        'In_Process_Pending',
        'Total_Stock',
        'Notes',
        'Site_Location',
        'Sub_Location2',
        'Sub_Location3',
        'Date_Received',
        'Received_By',
      ]

      const batchSize = 100

      const parseData = await parseExcelFile({ file, header: headers })
      const toImportData = parseData.map((row, i) => ({ rowNumber: i + 2, ...row }))

      //* trigger write by batch
      let batch: typeof toImportData = []
      let stats: Stats = { total: 0, completed: 0, progress: 0, errors: [], status: 'processing' }

      for (let i = 0; i < toImportData.length; i++) {
        const isLastRow = i === toImportData.length - 1
        const row = toImportData[i]

        //* add to batch
        batch.push(row)

        //* check if batch size is reached or last row
        if (batch.length === batchSize || isLastRow) {
          const response = await importData.executeAsync({
            data: batch,
            total: toImportData.length,
            stats,
            isLastRow,
            metaData: { projectCode },
          })
          const result = response?.data

          if (result?.error) {
            setStats((prev: any) => ({ ...prev, errors: [...prev.errors, ...result.stats.errors] }))
            stats.errors = [...stats.errors, ...result.stats.errors]
          } else if (result?.stats) {
            setStats(result.stats)
            stats = result.stats
          }

          batch = []
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Project groups imported successfully! ${stats.errors.length} errors found.`)
        setStats((prev: any) => ({ ...prev, total: 0, completed: 0, progress: 0, status: 'processing' }))
        router.refresh()
        items.execute({ projectCode })
      }

      if (stats.errors.length > 0) {
        setShowImportError(true)
        setImportErrors(stats.errors)
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to import file')
    }
  }

  const renderCommonSummaryIItems = () => {
    return (
      <>
        <GroupItem
          column='availableToOrder'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='stockIn'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='stockOut'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='totalStock'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />

        <TotalItem column='availableToOrder' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='stockIn' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='stockOut' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='totalStock' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
      </>
    )
  }

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (items.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [items.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      {!isViewMode ? (
        <div className='flex h-full w-full flex-col'>
          <Toolbar className='mt-5'>
            <CommonPageHeaderToolbarItems
              dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
              dataGridRef={dataGridRef}
              isLoading={isLoading || importData.isExecuting}
              isEnableImport
              onImport={handleImport}
              addButton={{
                text: 'Add Item',
                onClick: handleAdd,
              }}
              customs={{ exportToExcel }}
            />

            {stats && stats.progress && isLoading ? <ProgressBar min={0} max={100} showStatus={false} value={stats.progress} /> : null}
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
              <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
              <Column dataField='item.thumbnail' minWidth={150} caption='Thumbnail' cellRender={thumbnailCellRender} />
              <Column dataField='item.manufacturerPartNumber' dataType='string' caption='MFG P/N' />
              <Column dataField='item.manufacturer' dataType='string' caption='Manufacturer' />
              <Column dataField='partNumber' dataType='string' caption='Part Number' />
              <Column dataField='item.description' dataType='string' caption='Description' />
              <Column dataField='dateCode' dataType='string' caption='Date Code' />
              <Column dataField='countryOfOrigin' dataType='string' caption='Country Of Origin' />
              <Column dataField='lotCode' dataType='string' caption='Lot Code' />
              <Column dataField='palletNo' dataType='string' caption='Pallet No' />
              {/* <Column dataField='warehouse.name' dataType='string' caption='Warehouse' /> */}
              <Column dataField='dateReceived' dataType='datetime' caption='Date Received' />
              <Column
                dataField='dateReceivedBy'
                dataType='string'
                caption='Date Received By'
                calculateCellValue={dateReceivedByCalculatedCellValue}
              />
              <Column dataField='packagingType' dataType='string' caption='Packaging Type' />
              <Column dataField='spq' dataType='string' caption='SPQ' />
              <Column
                dataField='availableToOrder'
                dataType='number'
                caption='Available To Order'
                alignment='left'
                format={DEFAULT_NUMBER_FORMAT}
              />
              <Column
                dataField='stockIn'
                dataType='number'
                caption='Stock-In (In Process)'
                alignment='left'
                format={DEFAULT_NUMBER_FORMAT}
              />
              <Column
                dataField='stockOut'
                dataType='number'
                caption='Stock-Out (Delivered)'
                alignment='left'
                format={DEFAULT_NUMBER_FORMAT}
              />
              <Column dataField='totalStock' dataType='number' caption='Total Stock' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
              <Column dataField='cost' dataType='number' caption='Cost' alignment='left' format={DEFAULT_CURRENCY_FORMAT} />

              <Summary>
                <GroupItem
                  column='item.manufacturerPartNumber'
                  summaryType='count'
                  displayFormat='{0} item'
                  valueFormat={DEFAULT_NUMBER_FORMAT}
                />
                {renderCommonSummaryIItems()}
              </Summary>

              <Summary>
                <GroupItem column='item.manufacturer' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
                {renderCommonSummaryIItems()}
              </Summary>

              <Summary>
                <GroupItem column='partNumber' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
                {renderCommonSummaryIItems()}
              </Summary>

              <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
                <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
                <DataGridButton icon='edit' onClick={handleEdit} cssClass='!text-lg' hint='Edit' />
                <DataGridButton icon='trash' onClick={handleDelete} cssClass='!text-lg !text-red-500' hint='Delete' />
              </Column>
            </CommonDataGrid>

            <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)}>
              <ProjectItemForm
                projectCode={projectCode}
                projectName={projectName}
                setIsOpen={setIsOpen}
                onClose={handleClose}
                item={rowData || null}
                items={items}
                itemMasters={itemMasters}
                users={users}
              />
            </Popup>

            <AlertDialog
              isOpen={showConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to delete this inventory item named "${rowData?.item.description}"?`}
              onConfirm={() => handleConfirm(rowData?.code)}
              onCancel={() => setShowConfirmation(false)}
            />

            <ImportSyncErrorDataGrid
              isOpen={showImportError}
              setIsOpen={setShowImportError}
              data={importErrors}
              dataGridRef={importErrorDataGridRef}
            />
          </PageContentWrapper>
        </div>
      ) : rowData ? (
        <ProjectIndividualItemView data={rowData} onClose={handleClose} />
      ) : null}
    </div>
  )
}
