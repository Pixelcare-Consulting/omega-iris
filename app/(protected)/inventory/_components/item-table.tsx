'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { saveAs } from 'file-saver-es'
import { Anchor, Workbook } from 'exceljs'
import dxDataGrid from 'devextreme/ui/data_grid'
import { format } from 'date-fns'
import { parseExcelFile } from '@/utils/xlsx'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import { ImportSyncError } from '@/types/common'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'
import Button from 'devextreme-react/button'

import { deleteItem, getItems, importItems, syncToSap } from '@/actions/item'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import { exportDataGrid } from 'devextreme/common/export/excel'
import CommonDataGrid from '@/components/common-datagrid'

import { SyncToSapForm, syncToSapFormSchema } from '@/schema/item'
import LoadingButton from '@/components/loading-button'
import { useItemGroups } from '@/hooks/safe-actions/item-group'
import { useManufacturers } from '@/hooks/safe-actions/manufacturer'
import { SAP_BASE_URL } from '@/constants/sap'
import { callSapServiceLayerApi } from '@/actions/sap-service-layer'

type ItemTableProps = { items: Awaited<ReturnType<typeof getItems>> }
type DataSource = Awaited<ReturnType<typeof getItems>>

export default function ItemTable({ items }: ItemTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-inventory'
  const DATAGRID_UNIQUE_KEY = 'inventory'

  const form = useForm({
    mode: 'onChange',
    values: { items: [] },
    resolver: zodResolver(syncToSapFormSchema),
  })

  const itemsToSync = useWatch({ control: form.control, name: 'items' })

  const selectedRowKeys = useMemo(() => {
    if (itemsToSync.length < 1) return []
    return itemsToSync.map((wo) => wo.code)
  }, [JSON.stringify(itemsToSync)])

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false)

  const [showImportError, setShowImportError] = useState(false)
  const [showSyncError, setShowSyncError] = useState(false)

  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])
  const [syncErrors, setSyncErrors] = useState<ImportSyncError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)
  const syncErrorDataGridRef = useRef<DataGridRef | null>(null)

  const { executeAsync } = useAction(deleteItem)
  const importData = useAction(importItems)
  const syncData = useAction(syncToSap)

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
      setShowDeleteConfirmation(true)
      setRowData(data)
    },
    [setShowDeleteConfirmation, setRowData]
  )

  const handleConfirm = useCallback((code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

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

  const handleOnSelectionChange = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const allowData = e.selectedRowsData.filter((row) => row.syncStatus === 'pending')
    const notAllowData = e.selectedRowsData.filter((row) => row.syncStatus === 'synced')

    const values = allowData.map((row) => ({
      code: row.code,
      ItemCode: row.ItemCode,
      ItemName: row.ItemName,
      Manufacturer: row?.FirmCode ?? -1,
      ItemsGroupCode: row?.ItmsGrpCod ?? -1,
    }))

    if (notAllowData.length > 0) e.component.deselectRows(notAllowData.map((row) => row.code))

    form.setValue('items', values)
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
        setShowSyncError(true)
        setImportErrors(result?.errors || [])
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to import file!')
    }
  }

  const handleConfirmSync = async (formData: SyncToSapForm) => {
    try {
      setShowSyncConfirmation(false)

      const response = await syncData.executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message, { duration: 10000 })
      form.reset()
      router.refresh()

      if (result?.errors && result?.errors.length > 0) {
        setShowSyncError(true)
        setSyncErrors(result?.errors || [])
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to sync items to SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader
        title='Inventory'
        description='Manage and track your inventory effectively'
        isLoading={importData.isExecuting || syncData.isExecuting}
      >
        {selectedRowKeys.length > 0 && (
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Tooltip
              target='#sync-items-to-sap'
              contentRender={() => 'Sync To SAP'}
              showEvent='mouseenter'
              hideEvent='mouseleave'
              position='top'
            />
            <LoadingButton
              id='sync-items-to-sap'
              icon='upload'
              isLoading={syncData.isExecuting}
              text={`${selectedRowKeys.length} : Sync To SAP`}
              type='default'
              loadingText='Syncing'
              stylingMode='outlined'
              onClick={() => setShowSyncConfirmation(true)}
            />
          </Item>
        )}

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
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={items}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onSelectionChanged: handleOnSelectionChange }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='thumbnail' minWidth={140} caption='Thumbnail' cellRender={thumbnailCellRender} />
          <Column dataField='manufacturer' dataType='string' caption='Manufacturer' />
          <Column dataField='manufacturerPartNumber' dataType='string' caption='MFG P/N' />
          <Column dataField='description' dataType='string' caption='Description' />
          <Column dataField='syncStatus' dataType='string' caption='Sync Status' cssClass='capitalize' />
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
        isOpen={showDeleteConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this inventory item named "${rowData?.description}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showSyncConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to sync this item${itemsToSync.length > 1 ? 's' : ''} to SAP?`}
        onConfirm={() => handleConfirmSync(form.getValues())}
        onCancel={() => setShowSyncConfirmation(false)}
      />

      <ImportSyncErrorDataGrid
        isOpen={showImportError}
        setIsOpen={setShowImportError}
        data={importErrors}
        dataGridRef={importErrorDataGridRef}
      />

      <ImportSyncErrorDataGrid
        title='Sync Error'
        description='There was an error encountered while syncing.'
        isOpen={showSyncError}
        setIsOpen={setShowSyncError}
        data={syncErrors}
        dataGridRef={syncErrorDataGridRef}
      >
        <Column dataField='code' dataType='string' caption='Id' alignment='center' />
      </ImportSyncErrorDataGrid>
    </div>
  )
}
