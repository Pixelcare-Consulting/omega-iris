'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'

import { getBpMasterByPage, getBpMasterCount, getBps, syncFromSap } from '@/actions/business-partner'
import PageHeader from '@/app/(protected)/_components/page-header'
import { Badge } from '@/components/badge'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'

import { syncToSapFormSchema } from '@/schema/business-partner'
import LoadingButton from '@/components/loading-button'
import { useSyncMeta } from '@/hooks/safe-actions/sync-meta'
import { hideActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import CanView from '@/components/acl/can-view'
import { NotificationContext } from '@/context/notification'
import { Stats, SyncSectionState } from '@/types/common'
import { BP_MASTER_MAX_PAGE_SIZE } from '@/constants/sap'
import ProgressBar from 'devextreme-react/progress-bar'
import ImportSyncErrorDataGrid from '@/components/import-error-datagrid'

type SupplierTableProps = { bps: Awaited<ReturnType<typeof getBps>> }
type DataSource = Awaited<ReturnType<typeof getBps>>

const INITIAL_STATS: Stats = { total: 0, completed: 0, synced: 0, progress: 0, errors: [], status: 'idle' }

const INITIAL_SYNC_SECTION_STATE: SyncSectionState = {
  stats: INITIAL_STATS,
  errors: [],
  showError: false,
  showConfirmation: false,
}

export default function SupplierTable({ bps }: SupplierTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-supplier'
  const DATAGRID_UNIQUE_KEY = 'suppliers'

  // const notificationContext = useContext(NotificationContext)

  const form = useForm({
    mode: 'onChange',
    values: { bps: [], cardType: 'S' },
    resolver: zodResolver(syncToSapFormSchema),
  })

  const bpsToSync = useWatch({ control: form.control, name: 'bps' })

  const selectedRowKeys = useMemo(() => {
    if (bpsToSync.length < 1) return []
    return bpsToSync.map((wo) => wo.code)
  }, [JSON.stringify(bpsToSync)])

  const [isLoading, setIsLoading] = useState(false)

  const [syncFromSapState, setSyncFromSapState] = useState<SyncSectionState>(INITIAL_SYNC_SECTION_STATE)

  const dataGridRef = useRef<DataGridRef | null>(null)

  const syncMeta = useSyncMeta('supplier')

  const lastSyncedLabel = useMemo(() => {
    if (!syncMeta.data?.lastSyncAt) return 'Never synced'
    return `Last synced: ${format(syncMeta.data.lastSyncAt, 'PP, hh:mm a')}`
  }, [syncMeta.data?.lastSyncAt])
  const syncFromSapData = useAction(syncFromSap)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)
  const syncFromSapErrorDataGridRef = useRef<DataGridRef | null>(null)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/suppliers/${data?.code}/view`)
  }, [])

  const handleConfirmSyncFromSap = async (cardType: string) => {
    setIsLoading(true)
    setSyncFromSapState((prev) => ({ ...prev, showConfirmation: false, stats: { ...INITIAL_STATS, status: 'processing' } }))

    try {
      //* get total count of bp master from sap
      const totalCount = await getBpMasterCount(cardType)

      if (totalCount < 1) {
        toast.error('Failed to fetch supplier master from SAP!')
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        setIsLoading(false)
        return
      }

      const totalPage = Math.ceil(totalCount / BP_MASTER_MAX_PAGE_SIZE)

      //* trigger sync by page
      let stats: Stats = { total: totalCount, completed: 0, synced: 0, progress: 0, errors: [], status: 'processing' }

      for (let page = 0; page <= totalPage; page++) {
        const isLastPage = page === totalPage

        //* fetch bp master from sap per page
        const pageData = await getBpMasterByPage(cardType, page)

        if (pageData.length < 1) {
          if (isLastPage) stats.status = 'completed'
          continue
        }

        const response = await syncFromSapData.executeAsync({
          data: pageData,
          total: totalCount,
          stats,
          isLastRow: isLastPage,
          cardType,
        })
        const result = response?.data

        if (result?.error) {
          setSyncFromSapState((prev) => ({ ...prev, stats: { ...prev.stats, errors: [...prev.stats.errors, ...result.stats.errors] } }))
          stats.errors = [...stats.errors, ...result.stats.errors]
        } else if (result?.stats) {
          setSyncFromSapState((prev) => ({ ...prev, stats: result.stats }))
          stats = result.stats
        }
      }

      if (stats.status === 'completed') {
        toast.success(`Supplier master synced from SAP successfully!. ${stats.errors.length} errors found.`)
        setSyncFromSapState((prev) => ({ ...prev, stats: INITIAL_STATS }))
        router.refresh()
        syncMeta.execute({ code: 'supplier' })
        // notificationContext?.handleRefresh()
      }

      if (stats.errors.length > 0) {
        setSyncFromSapState((prev) => ({ ...prev, showError: true, errors: stats.errors }))
        // notificationContext?.handleRefresh()
      }

      setIsLoading(false)
    } catch (error: any) {
      console.log({ error })
      console.error(error)
      setIsLoading(false)
      toast.error(error?.message || 'Failed to sync supplier from SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader
        title={
          <>
            <span className='pr-1.5'>Suppliers</span>
            <Badge variant={syncMeta.data?.lastSyncAt ? 'soft-green' : 'soft-slate'}>{lastSyncedLabel}</Badge>
          </>
        }
        description='Manage and track your suppliers effectively'
      >
        {selectedRowKeys.length < 1 && (
          <CanView subject='p-suppliers' action='sync from sap'>
            <Item location='after' locateInMenu='auto' widget='dxButton'>
              {!syncMeta.isLoading && (
                <Tooltip
                  target='#sync-from-sap-to-portal'
                  contentRender={() => lastSyncedLabel}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
              )}
              <LoadingButton
                id='sync-from-sap-to-portal'
                icon='refresh'
                isLoading={syncFromSapData.isExecuting || syncFromSapState.stats.status === 'processing'}
                type='default'
                text='Sync From SAP'
                loadingText={syncMeta.isLoading ? 'Depedecy loading' : 'Syncing'}
                stylingMode='outlined'
                onClick={() => setSyncFromSapState((prev) => ({ ...prev, showConfirmation: true }))}
              />
            </Item>
          </CanView>
        )}

        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={isLoading || syncFromSapData.isExecuting}
          exportOptions={{ subjects: 'p-suppliers', actions: 'export', isLoading: syncFromSapData.isExecuting }}
        />

        {isLoading && syncFromSapState.stats.status === 'processing' ? (
          <ProgressBar min={0} max={100} showStatus={false} value={syncFromSapState.stats.progress} />
        ) : null}
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={bps}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='CardCode' dataType='string' caption='Code' />
          <Column dataField='CardName' dataType='string' caption='Name' />
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
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-suppliers' action='view'>
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
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>

      <AlertDialog
        isOpen={syncFromSapState.showConfirmation}
        title='Are you sure?'
        description='Are you sure you want to sync from SAP?'
        onConfirm={() => handleConfirmSyncFromSap('S')}
        onCancel={() => setSyncFromSapState((prev) => ({ ...prev, showConfirmation: false }))}
      />

      <ImportSyncErrorDataGrid
        title='Sync From SAP Error'
        description='There was an error encountered while syncing.'
        isOpen={syncFromSapState.showError}
        setIsOpen={(value) => setSyncFromSapState((prev) => ({ ...prev, showError: value }))}
        data={syncFromSapState.errors}
        dataGridRef={syncFromSapErrorDataGridRef}
      >
        <Column dataField='code' dataType='string' caption='Id' alignment='center' />
      </ImportSyncErrorDataGrid>
    </div>
  )
}
