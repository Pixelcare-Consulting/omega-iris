'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'

import { getBps, syncFromSap } from '@/actions/business-partner'
import PageHeader from '@/app/(protected)/_components/page-header'
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

type SupplierTableProps = { bps: Awaited<ReturnType<typeof getBps>> }
type DataSource = Awaited<ReturnType<typeof getBps>>

export default function SupplierTable({ bps }: SupplierTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-supplier'
  const DATAGRID_UNIQUE_KEY = 'suppliers'

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

  const [showSyncFromSapConfirmation, setShowSyncFromSapConfirmation] = useState(false)

  const dataGridRef = useRef<DataGridRef | null>(null)

  const syncMeta = useSyncMeta('supplier')
  const syncFromSapData = useAction(syncFromSap)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/suppliers/${data?.code}/view`)
  }, [])

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
      syncMeta.execute({ code: 'supplier' })
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to sync suppliers from SAP!', { duration: 10000 })
    }
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Suppliers' description='Manage and track your suppliers effectively' isLoading={syncFromSapData.isExecuting}>
        {selectedRowKeys.length < 1 && (
          <CanView subject='p-suppliers' action='sync from sap'>
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
          isLoading={syncFromSapData.isExecuting}
          exportOptions={{ subjects: 'p-suppliers', actions: 'export' }}
        />
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
        isOpen={showSyncFromSapConfirmation}
        title='Are you sure?'
        description='Are you sure you want to sync from SAP?'
        onConfirm={() => handleConfirmSyncFromSap('S')}
        onCancel={() => setShowSyncFromSapConfirmation(false)}
      />
    </div>
  )
}
