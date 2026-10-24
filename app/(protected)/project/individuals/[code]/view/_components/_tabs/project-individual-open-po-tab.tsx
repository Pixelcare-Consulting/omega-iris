'use client'

import { Column, DataGridTypes, DataGridRef, Summary, TotalItem } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { differenceInCalendarDays, format, startOfDay } from 'date-fns'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import LoadingButton from '@/components/loading-button'
import AlertDialog from '@/components/alert-dialog'
import CanView from '@/components/acl/can-view'
import { Badge } from '@/components/badge'
import { getPoLineItems, syncOpenPoLinesFromSapClient } from '@/actions/po-line-item'
import { usePoLineItems } from '@/hooks/safe-actions/po-line-item'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import { useJobSchedule, useSyncMeta } from '@/hooks/safe-actions/sync-meta'
import { useCustomTfsProcess } from '@/hooks/use-custom-tfs-process'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { OPEN_PO_LINE_SYNC_JOB_CODE, OPEN_PO_LINE_SYNC_META_CODE } from '@/constants/sap'

type ProjectIndividualOpenPoTabProps = {
  projectCode: number
  warehouses: string[]
}

type DataSource = Awaited<ReturnType<typeof getPoLineItems>>

//* the line delivery date, the header due date only covers lines synced before ShipDate was added
function deliveryDate(rowData: DataSource[number]) {
  return rowData?.ShipDate ?? rowData?.DocDueDate ?? null
}

//* days from today to the line delivery date, negative once overdue
function daysUntilDelivery(rowData: DataSource[number]) {
  const date = deliveryDate(rowData)
  if (!date) return null
  return differenceInCalendarDays(startOfDay(new Date(date)), startOfDay(new Date()))
}

//* stock is per item/whs, so each pair counts once however many po lines it is on
//? no column on the total item, so options.value is the whole row
// function calculateAvailableToOrderTotal(options: DataGridTypes.CustomSummaryInfo) {
//   if (options.name !== 'availableToOrderTotal') return

//   if (options.summaryProcess === 'start') options.totalValue = new Map<string, number>()

//   if (options.summaryProcess === 'calculate') {
//     const row = options.value as DataSource[number]
//     options.totalValue.set(`${row.ItemCode}|${row.WhsCode}`, row.availableToOrder)
//   }

//   if (options.summaryProcess === 'finalize') {
//     options.totalValue = [...(options.totalValue as Map<string, number>).values()].reduce((total, value) => total + value, 0)
//   }
// }

export default function ProjectIndividualOpenPoTab({ projectCode, warehouses }: ProjectIndividualOpenPoTabProps) {
  const { isEnabled: isCustomTfsEnabled } = useCustomTfsProcess()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-open-po'
  const DATAGRID_UNIQUE_KEY = 'project-individual-open-pos'

  const [showSyncFromSapConfirmation, setShowSyncFromSapConfirmation] = useState(false)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const poLineItems = usePoLineItems(projectCode, warehouses)
  const syncFromSapData = useAction(syncOpenPoLinesFromSapClient)

  const syncMeta = useSyncMeta(OPEN_PO_LINE_SYNC_META_CODE)
  const jobSchedule = useJobSchedule(OPEN_PO_LINE_SYNC_JOB_CODE)

  const lastSyncedLabel = useMemo(() => {
    if (!syncMeta.data?.lastSyncAt) return 'Never synced'
    return `Last synced: ${format(syncMeta.data.lastSyncAt, 'PP, hh:mm a')}`
  }, [syncMeta.data?.lastSyncAt])

  //* tells the user the sync also runs on its own, so they know a manual run is optional
  const autoSyncLabel = useMemo(() => {
    if (!jobSchedule.isEnabled) return 'Auto sync: off'
    return `Auto sync: ${jobSchedule.label}`
  }, [jobSchedule.isEnabled, jobSchedule.label])

  const warehouseLabel = useMemo(() => {
    if (warehouses.length < 1) return 'Warehouse: none selected'
    return `Warehouse: ${warehouses.join(', ')}`
  }, [JSON.stringify(warehouses)])

  const syncFromSapDescription = useMemo(() => {
    const base =
      'This syncs purchase order lines from SAP for every project in the system, not only this one. Open lines are added or updated, closed and cancelled lines are removed.'

    if (!jobSchedule.isEnabled) return `${base} Automatic syncing is off, so lines only come in when someone syncs by hand.`

    return `${base} This also runs on its own ${jobSchedule.label}, so a manual sync is only needed when you cannot wait for the next run.`
  }, [jobSchedule.isEnabled, jobSchedule.label])

  const daysUntilDeliveryCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const days = e.value as number | null

    if (days === null || days === undefined) return null

    if (days < 0) {
      return (
        <div className='flex items-center gap-3'>
          <span className='font-semibold text-red-600'>{days}</span>
          <Badge variant='soft-red'>Overdue</Badge>
        </div>
      )
    }

    if (days === 0) {
      return (
        <div className='flex items-center gap-3'>
          <span className='font-semibold text-amber-600'>{days}</span>
          <Badge variant='soft-amber'>Due today</Badge>
        </div>
      )
    }

    return (
      <div className='flex items-center gap-3'>
        <span className='font-semibold'>{days}</span>
        <Badge variant='soft-green'>On time</Badge>
      </div>
    )
  }, [])

  const handleConfirmSyncFromSap = async () => {
    setShowSyncFromSapConfirmation(false)

    try {
      const response = await syncFromSapData.executeAsync()
      const result = response?.data

      if (!result || result.error) {
        toast.error(result?.message || 'Failed to sync from SAP')
        return
      }

      toast.success(`Open PO lines synced from SAP! ${result.message}`)
      poLineItems.execute({ projectCode, warehouseCodes: warehouses })
      syncMeta.execute({ code: OPEN_PO_LINE_SYNC_META_CODE })
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to sync from SAP')
    }
  }

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (poLineItems.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [poLineItems.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5 px-4'>
        {!syncMeta.isLoading && (
          <Item location='before' locateInMenu='auto'>
            <Badge variant={syncMeta.data?.lastSyncAt ? 'soft-green' : 'soft-slate'}>{lastSyncedLabel}</Badge>
          </Item>
        )}

        {!jobSchedule.isLoading && (
          <Item location='before' locateInMenu='auto'>
            <Badge variant={jobSchedule.isEnabled ? 'soft-slate' : 'soft-amber'}>{autoSyncLabel}</Badge>
          </Item>
        )}

        <Item location='before' locateInMenu='auto'>
          <Badge variant='soft-red'>{warehouseLabel}</Badge>
        </Item>

        <Item location='before' locateInMenu='auto'>
          <Badge variant='soft-slate'>Open lines only</Badge>
        </Item>

        {isCustomTfsEnabled && (
          <CanView subject='p-projects-individual-inventory' action='sync from sap'>
            <Item location='after' locateInMenu='auto' widget='dxMenu'>
              <Tooltip
                target='#sync-open-po-from-sap'
                contentRender={() => 'Sync open PO lines from SAP'}
                showEvent='mouseenter'
                hideEvent='mouseleave'
                position='top'
              />
              <LoadingButton
                id='sync-open-po-from-sap'
                icon='refresh'
                isLoading={syncFromSapData.isExecuting}
                text='Sync from SAP'
                type='default'
                stylingMode='outlined'
                onClick={() => setShowSyncFromSapConfirmation(true)}
              />
            </Item>
          </CanView>
        )}

        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          isLoading={poLineItems.isLoading}
          exportOptions={{ subjects: 'p-projects-individual-inventory', actions: 'export' }}
        />
      </Toolbar>

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={poLineItems.data}
          isLoading={poLineItems.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          dataGridStore={dataGridStore}
        >
          <Column dataField='ItemCode' dataType='string' caption='Item Code' />
          <Column dataField='Dscription' dataType='string' caption='Description' />
          <Column dataField='U_CPN' dataType='string' caption='Customer Part No.' />
          <Column dataField='DocNum' dataType='number' caption='PO No.' alignment='left' sortOrder='asc' sortIndex={0} />
          <Column dataField='CardCode' dataType='string' caption='Vendor Code' />
          <Column dataField='WhsCode' dataType='string' caption='Warehouse' />
          <Column dataField='DocDate' dataType='date' caption='PO Date' />
          <Column dataField='ShipDate' dataType='date' caption='Delivery Date' calculateCellValue={deliveryDate} />
          <Column
            dataField='daysUntilDelivery'
            dataType='number'
            caption='Days Until Delivery'
            alignment='left'
            calculateCellValue={daysUntilDelivery}
            cellRender={daysUntilDeliveryCellRender}
          />

          {/* <Column
            dataField='availableToOrder'
            dataType='number'
            caption='Available To Order'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            fixed
            fixedPosition='right'
          /> */}
          <Column
            dataField='onOrder'
            dataType='number'
            caption='On Order'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            fixed
            fixedPosition='right'
          />

          <Summary>
            <TotalItem column='ItemCode' summaryType='count' displayFormat='{0} open PO lines' />
            {/* <TotalItem
              name='availableToOrderTotal'
              summaryType='custom'
              showInColumn='availableToOrder'
              displayFormat='{0}'
              valueFormat={DEFAULT_NUMBER_FORMAT}
            /> */}
            <TotalItem column='onOrder' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
          </Summary>
        </CommonDataGrid>

        <AlertDialog
          isOpen={showSyncFromSapConfirmation}
          title='Are you sure?'
          height={230}
          maxWidth={620}
          description={syncFromSapDescription}
          onConfirm={handleConfirmSyncFromSap}
          onCancel={() => setShowSyncFromSapConfirmation(false)}
        />
      </div>
    </div>
  )
}
