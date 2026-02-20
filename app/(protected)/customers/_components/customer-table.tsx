'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'
import { ImportSyncError, Stats } from '@/types/common'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'

import { deleteBp, getBps, importBp, restoreBp, syncFromSap, syncToSap } from '@/actions/business-partner'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import ProgressBar from 'devextreme-react/progress-bar'

import { BUSINESS_PARTNER_TYPE_MAP, SyncToSapForm, syncToSapFormSchema } from '@/schema/business-partner'
import LoadingButton from '@/components/loading-button'
import { useSyncMeta } from '@/hooks/safe-actions/sync-meta'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import CanView from '@/components/acl/can-view'
import { useBpGroups } from '@/hooks/safe-actions/businsess-partner-group'
import { useCurrencies } from '@/hooks/safe-actions/currency'
import { usePaymentTerms } from '@/hooks/safe-actions/payment-term'
import { useAccountTypes } from '@/hooks/safe-actions/account-type'
import { useBusinessTypes } from '@/hooks/safe-actions/business-type'
import { parseExcelFile } from '@/utils/xlsx'
import { NotificationContext } from '@/context/notification'

type CustomerTableProps = { bps: Awaited<ReturnType<typeof getBps>> }
type DataSource = Awaited<ReturnType<typeof getBps>>

export default function CustomerTable({ bps }: CustomerTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-customer'
  const DATAGRID_UNIQUE_KEY = 'customers'

  // const notificationContext = useContext(NotificationContext)

  const form = useForm({
    mode: 'onChange',
    values: { bps: [], cardType: 'C' },
    resolver: zodResolver(syncToSapFormSchema),
  })

  const bpsToSync = useWatch({ control: form.control, name: 'bps' })

  const selectedRowKeys = useMemo(() => {
    if (bpsToSync.length < 1) return []
    return bpsToSync.map((wo) => wo.code)
  }, [JSON.stringify(bpsToSync)])

  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, progress: 0, errors: [], status: 'processing' })

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [showSyncToSapConfirmation, setShowSyncToSapConfirmation] = useState(false)
  const [showSyncFromSapConfirmation, setShowSyncFromSapConfirmation] = useState(false)

  const [showImportError, setShowImportError] = useState(false)
  const [showSyncError, setShowSyncError] = useState(false)

  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [importErrors, setImportErrors] = useState<ImportSyncError[]>([])
  const [syncErrors, setSyncErrors] = useState<ImportSyncError[]>([])

  const dataGridRef = useRef<DataGridRef | null>(null)
  const importErrorDataGridRef = useRef<DataGridRef | null>(null)
  const syncErrorDataGridRef = useRef<DataGridRef | null>(null)

  const deleteBpData = useAction(deleteBp)
  const restoreBpData = useAction(restoreBp)
  const importData = useAction(importBp)
  const syncMeta = useSyncMeta('customer')
  const syncToSapData = useAction(syncToSap)
  const syncFromSapData = useAction(syncFromSap)

  const bpGroups = useBpGroups()
  const currencies = useCurrencies()
  const paymentTerms = usePaymentTerms()
  const accountTypes = useAccountTypes()
  const businessTypes = useBusinessTypes()

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const importDependenciesIsLoading = useMemo(() => {
    return bpGroups.isLoading || currencies.isLoading || paymentTerms.isLoading || accountTypes.isLoading || businessTypes.isLoading
  }, [bpGroups.isLoading, currencies.isLoading, paymentTerms.isLoading, accountTypes.isLoading, businessTypes.isLoading])

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/customers/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/customers/${code}`)
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

  const handleRestore = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowRestoreConfirmation(true)
      setRowData(data)
    },
    [setShowRestoreConfirmation, setRowData]
  )

  const handleConfirmDelete = (code?: number, cardType?: string) => {
    if (!code || !cardType) return

    setShowDeleteConfirmation(false)

    const cardTypeValue = BUSINESS_PARTNER_TYPE_MAP?.[cardType] || 'Lead'

    toast.promise(deleteBpData.executeAsync({ code, cardType }), {
      loading: `Deleting ${cardTypeValue.toLowerCase()}...`,
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: `Failed to delete ${cardTypeValue.toLowerCase()}!`, unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            // notificationContext?.handleRefresh()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  const handleConfirmRestore = (code?: number, cardType?: string) => {
    if (!code || !cardType) return

    setShowRestoreConfirmation(false)

    const cardTypeValue = BUSINESS_PARTNER_TYPE_MAP?.[cardType] || 'Lead'

    toast.promise(restoreBpData.executeAsync({ code, cardType }), {
      loading: `Restoring ${cardTypeValue.toLowerCase()}...`,
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: `Failed to restore ${cardTypeValue.toLowerCase()}!`, unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            // notificationContext?.handleRefresh()
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  const handleOnSelectionChanged = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const instance = e.component

    //* exclude selection are row with syncStatus === synced or has deletedAt or deletedBy
    const allowData = e.selectedRowsData.filter((row) => row.syncStatus === 'pending' && !row?.deletedAt && !row?.deletedBy)

    const values = allowData.map((row) => ({
      code: row.code,
      CardCode: row.CardCode,
      CardName: row.CardName,
      CardType: row.CardType,
      CurrCode: row?.CurrCode ?? null,
      GroupCode: row?.GroupCode ?? null,
      GroupNum: row?.GroupNum ?? null,
      Phone1: row?.Phone1 ?? null,
      AcctType: row?.AcctType ?? null,
      CmpPrivate: row?.CmpPrivate ?? null,
    }))

    if (values.length < 1) instance.deselectAll()

    form.setValue('bps', values)
  }, [])

  const handleImport: (...args: any[]) => void = async (args) => {
    const { file } = args

    setIsLoading(true)

    try {
      const headers: string[] = [
        'Code',
        'Name',
        'Group',
        'Account_Type',
        'Type_Of_Business',
        'Currency',
        'Payment_Terms',
        'Active',
        'Phone_1',
      ]
      const batchSize = 100

      //* parse excel file
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
            metaData: {
              bpGroups: bpGroups.data,
              currencies: currencies.data,
              paymentTerms: paymentTerms.data,
              accountTypes: accountTypes.data,
              businessTypes: businessTypes.data,
              cardType: 'L',
            },
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
        toast.success(`Customer imported successfully! ${stats.errors.length} errors found.`)
        setStats((prev: any) => ({ ...prev, total: 0, completed: 0, progress: 0, status: 'processing' }))
        router.refresh()
        // notificationContext?.handleRefresh()
      }

      if (stats.errors.length > 0) {
        setShowImportError(true)
        setImportErrors(stats.errors)
        // notificationContext?.handleRefresh()
      }

      setIsLoading(false)
    } catch (error: any) {
      console.error(error)
      setIsLoading(false)
      toast.error(error?.message || 'Failed to import file!')
    }
  }

  const handleConfirmSyncToSap = async (formData: SyncToSapForm) => {
    try {
      setShowSyncToSapConfirmation(false)

      const response = await syncToSapData.executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message, { duration: 10000 })
      form.reset()
      router.refresh()
      // notificationContext?.handleRefresh()

      if (result?.errors && result?.errors.length > 0) {
        setShowSyncError(true)
        setSyncErrors(result?.errors || [])
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to sync items to SAP!', { duration: 10000 })
    }
  }

  const handleConfirmSyncFromSap = async (cardType: string) => {
    try {
      setShowSyncFromSapConfirmation(false)

      const response = await syncFromSapData.executeAsync({ cardType })
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)
      router.refresh()
      // notificationContext?.handleRefresh()
      syncMeta.execute({ code: 'customer' })
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to sync customers from SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader
        title='Customers'
        description='Manage and track your customers effectively'
        isLoading={syncToSapData.isExecuting || syncFromSapData.isExecuting}
      >
        {selectedRowKeys.length > 0 && (
          <CanView subject='p-customers' action='sync to sap'>
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
                isLoading={syncToSapData.isExecuting}
                text={`${selectedRowKeys.length} : Sync To SAP`}
                type='default'
                loadingText='Syncing'
                stylingMode='outlined'
                onClick={() => setShowSyncToSapConfirmation(true)}
              />
            </Item>
          </CanView>
        )}

        {selectedRowKeys.length < 1 && (
          <CanView subject='p-customers' action='sync from sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              {!syncMeta.isLoading && (
                <Tooltip
                  target='#sync-from-sap-to-portal'
                  contentRender={() => `Last Sync: ${format(syncMeta.data?.lastSyncAt || new Date('01/01/2020'), 'PP, hh:mm a')}`}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
              )}
              <LoadingButton
                id='sync-from-sap-to-portal'
                icon='refresh'
                isLoading={syncFromSapData.isExecuting}
                type='default'
                text='Sync From SAP'
                loadingText={syncMeta.isLoading ? 'Depedecy loading' : 'Syncing'}
                stylingMode='outlined'
                onClick={() => setShowSyncFromSapConfirmation(true)}
              />
            </Item>
          </CanView>
        )}

        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={isLoading || importData.isExecuting || syncToSapData.isExecuting || syncFromSapData.isExecuting}
          isEnableImport
          onImport={handleImport}
          addButton={{ text: 'Add Customer', onClick: () => router.push('/customers/add'), subjects: 'p-customers', actions: 'create' }}
          importOptions={{ subjects: 'p-customers', actions: 'import', isLoading: importDependenciesIsLoading }}
          exportOptions={{ subjects: 'p-customers', actions: 'export' }}
        />

        {stats && stats.progress && isLoading ? <ProgressBar min={0} max={100} showStatus={false} value={stats.progress} /> : null}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={bps}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onSelectionChanged: handleOnSelectionChanged }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='CardCode' dataType='string' caption='Code' />
          <Column dataField='CardName' dataType='string' caption='Name' />
          <Column
            dataField='CardType'
            dataType='string'
            caption='Type'
            calculateDisplayValue={(rowData) => BUSINESS_PARTNER_TYPE_MAP?.[rowData.CardType] || 'Lead'}
          />
          <Column dataField='GroupName' dataType='string' caption='Group' />
          <Column dataField='CurrName' dataType='string' caption='Currency' />
          <Column dataField='PymntGroup' dataType='string' caption='Payment Term' />
          <Column dataField='AcctType' dataType='string' caption='Account Type' />
          <Column dataField='syncStatus' dataType='string' caption='Sync Status' cssClass='capitalize' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-customers' action='view'>
              <DataGridButton
                icon='eyeopen'
                onClick={handleView}
                cssClass='!text-lg'
                hint='View'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>
            <CanView subject='p-customers' action='edit'>
              <DataGridButton
                icon='edit'
                onClick={handleEdit}
                cssClass='!text-lg'
                hint='Edit'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced')
                }}
              />
            </CanView>
            <CanView subject='p-customers' action='delete'>
              <DataGridButton
                icon='trash'
                onClick={handleDelete}
                cssClass='!text-lg !text-red-500'
                hint='Delete'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.syncStatus === 'synced')
                }}
              />
            </CanView>
            <CanView subject='p-customers' action='restore'>
              <DataGridButton
                icon='undo'
                onClick={handleRestore}
                cssClass='!text-lg !text-blue-500'
                hint='Restore'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return showActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={showDeleteConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to delete this customer named "${rowData?.CardName}"?`}
        onConfirm={() => handleConfirmDelete(rowData?.code, rowData?.CardType)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this customer named "${rowData?.CardName}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code, rowData?.CardType)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />

      <AlertDialog
        isOpen={showSyncToSapConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to sync this customer${bpsToSync.length > 1 ? 's' : ''} to SAP?`}
        onConfirm={() => handleConfirmSyncToSap(form.getValues())}
        onCancel={() => setShowSyncToSapConfirmation(false)}
      />

      <AlertDialog
        isOpen={showSyncFromSapConfirmation}
        title='Are you sure?'
        description='Are you sure you want to sync from SAP?'
        onConfirm={() => handleConfirmSyncFromSap('C')}
        onCancel={() => setShowSyncFromSapConfirmation(false)}
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
