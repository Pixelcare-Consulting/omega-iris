'use client'

import { DataGridTypes, DataGridRef, Button as DataGridButton, Summary, TotalItem, GroupItem } from 'devextreme-react/data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toolbar from 'devextreme-react/toolbar'
import { useRouter } from 'next/navigation'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useSession } from 'next-auth/react'
import Column from '@/components/column'
import { useBatchesMasterByWarehouseCode } from '@/hooks/safe-actions/batches'
import { getBatchesMasterByWarehouseCode } from '@/actions/batches'
import { parseSapCompactDate } from '@/utils/sap'
import { formatNumber } from 'devextreme/localization'
import { safeParseInt } from '@/utils'
import WarehouseBatchView from '../warehouse-batches-view'
import FormMessage from '@/components/forms/form-message'

type WarehouseBatchTabProps = {
  warehouseCode: string
  isSynced: boolean
  batches: ReturnType<typeof useBatchesMasterByWarehouseCode>
}

type DataSource = Awaited<ReturnType<typeof getBatchesMasterByWarehouseCode>>

export default function WarehouseBatchTab({ warehouseCode, isSynced, batches }: WarehouseBatchTabProps) {
  const { data: session } = useSession()

  const DATAGRID_STORAGE_KEY = `dx-datagrid-batch-by-${warehouseCode}`
  const DATAGRID_UNIQUE_KEY = `warehouse-batches-${warehouseCode}`

  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const siteLocationCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const siteLocation = data?.WhsCode || ''

    const available = safeParseInt(data?.OnHand) - safeParseInt(data?.IsCommited) + safeParseInt(data?.OnOrder)

    if (!siteLocation) return null

    return (
      <div className='flex flex-col gap-1'>
        <div>{siteLocation}</div>

        <div className='flex gap-1'>
          <span>On Hand:</span>
          <span className='font-semibold'>{formatNumber(data?.OnHand, DEFAULT_NUMBER_FORMAT)}</span>
        </div>

        <div className='flex gap-1'>
          <span>Committed:</span>
          <span className='font-semibold'>{formatNumber(data?.IsCommited, DEFAULT_NUMBER_FORMAT)}</span>
        </div>

        <div className='flex gap-1'>
          <span>Ordered:</span>
          <span className='font-semibold'>{formatNumber(data?.OnOrder, DEFAULT_NUMBER_FORMAT)}</span>
        </div>

        <div className='flex gap-1'>
          <span>Available:</span>
          <span className='font-semibold'>{formatNumber(available, DEFAULT_NUMBER_FORMAT)}</span>
        </div>
      </div>
    )
  }, [])

  const binLocationCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const binLocation = data?.BinCode || ''

    if (!binLocation) return null

    return (
      <div className='flex flex-col gap-1'>
        <div>{binLocation}</div>

        <div className='flex gap-1'>
          <span>On Hand:</span>
          <span className='font-semibold'>{formatNumber(data?.BinOnHandQty, DEFAULT_NUMBER_FORMAT)}</span>
        </div>
      </div>
    )
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

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsViewMode(false)
  }, [])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (batches.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [batches.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      {!isViewMode ? (
        <div className='flex h-full w-full flex-col'>
          <Toolbar className='mt-5'>
            <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} isLoading={batches.isLoading} />
          </Toolbar>

          {!isSynced && (
            <div className='col-span-12 px-4'>
              <FormMessage>Warehouse "{warehouseCode}" is not synced, batches not available</FormMessage>
            </div>
          )}

          <div className='min-h-0 flex-1 p-4'>
            <CommonDataGrid
              dataGridRef={dataGridRef}
              data={batches.data}
              isLoading={isSynced && batches.isLoading}
              storageKey={DATAGRID_STORAGE_KEY}
              keyExpr='DistNumber'
              dataGridStore={dataGridStore}
              callbacks={{ onRowClick: handleView }}
            >
              <Column dataField='DistNumber' dataType='string' minWidth={100} caption='Batch #' sortOrder='asc' />
              <Column dataField='U_ProjectID' dataType='string' caption='Project ID' visible={false} />
              <Column dataField='U_Owner' dataType='string' caption='Owner' />

              <Column dataField='U_Group' dataType='string' caption='Group' />
              <Column dataField='U_Division' dataType='string' caption='Division' />
              <Column dataField='U_Site' dataType='string' caption='Site' />
              <Column dataField='U_CMSite' dataType='string' caption='CM Site' />
              <Column dataField='U_Phase' dataType='string' caption='Phase' />

              <Column dataField='ItemCode' dataType='string' caption='MFG P/N' />
              <Column dataField='U_PartNumber' dataType='string' caption='Part Number' />
              <Column dataField='FirmName' dataType='string' caption='Manufacturer' />
              <Column dataField='ItemName' dataType='string' caption='Description' />
              <Column dataField='U_Commodities' dataType='string' caption='Commodities' />

              <Column dataField='U_DateCode' minWidth={75} dataType='string' caption='DC' />
              <Column dataField='MnfSerial' minWidth={80} dataType='string' caption='COO' />
              <Column dataField='U_LotCode' dataType='string' caption='Lot Code' />
              <Column dataField='WhsCode' dataType='string' caption='Site Location' minWidth={250} cellRender={siteLocationCellRender} />
              <Column dataField='BinCode' dataType='string' caption='Bin Location' minWidth={250} cellRender={binLocationCellRender} />

              {!isBusinessPartner && (
                <Column
                  dataField='InDate'
                  dataType='datetime'
                  caption='Date Received'
                  visible={false}
                  calculateCellValue={(rowData) => parseSapCompactDate(rowData?.InDate)}
                  format='MM/dd/yyyy'
                />
              )}

              <Column dataField='U_PackagingType' dataType='string' caption='Packaging Type' />
              <Column dataField='U_SPQ' dataType='string' caption='SPQ' />

              {!isBusinessPartner ? (
                <Column dataField='Quantity' dataType='number' caption='Total Stock' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
              ) : null}

              <Column dataField='Notes' dataType='string' caption='Notes' visible={false} />

              <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
                <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
              </Column>
            </CommonDataGrid>
          </div>
        </div>
      ) : (
        <WarehouseBatchView data={rowData} onClose={handleClose} />
      )}
    </div>
  )
}
