'use client'

import { DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { useCallback, useMemo, useRef, useState } from 'react'
import Toolbar from 'devextreme-react/toolbar'
import Popup from 'devextreme-react/popup'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import AlertDialog from '@/components/alert-dialog'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { useSession } from 'next-auth/react'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'
import Column from '@/components/column'
import { useWarehouseBinLocations } from '@/hooks/safe-actions/warehouse-bin-location'
import { useWarehouseSubLevelCodes } from '@/hooks/safe-actions/warehouse-sublevel-codes'
import { deleleteWarehouseBinLocation, getWarehouseBinLocations, restoreWarehouseBinLocation } from '@/actions/warehouse-bin-location'
import WarehouseBinLocationForm from '@/app/(protected)/warehouses/_components/warehouse-bin-location-form'
import WarehouseBinLocationView from '@/app/(protected)/warehouses/_components/warehouse-bin-location-view'

type WarehouseBinLocationTabProps = {
  warehouseCode: string
  warehouseName: string
  warehouseSyncStatus: string
  binLocations: ReturnType<typeof useWarehouseBinLocations>
  sublevel1Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel2Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel3Codes: ReturnType<typeof useWarehouseSubLevelCodes>
  sublevel4Codes: ReturnType<typeof useWarehouseSubLevelCodes>
}

type DataSource = Awaited<ReturnType<typeof getWarehouseBinLocations>>

export default function WarehouseBinLocationTab({
  warehouseCode,
  warehouseName,
  warehouseSyncStatus,
  binLocations,
  sublevel1Codes,
  sublevel2Codes,
  sublevel3Codes,
  sublevel4Codes,
}: WarehouseBinLocationTabProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-warehouse-bin-location'
  const DATAGRID_UNIQUE_KEY = 'warehouse-bin-locations'

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)

  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const dataGridRef = useRef<DataGridRef | null>(null)
  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const deleleteWarehouseBinLocationData = useAction(deleleteWarehouseBinLocation)
  const restoreWarehouseBinLocationData = useAction(restoreWarehouseBinLocation)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

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

  const handleClose = useCallback(() => {
    setRowData(null)
    setIsOpen(false)
    setIsViewMode(false)
  }, [])

  const handleConfirmDelete = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleleteWarehouseBinLocationData.executeAsync({ code }), {
      loading: 'Deleting bin location...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete bin location!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            binLocations.execute({ warehouseCode })
            // notificationContext?.handleRefresh()
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
  }

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restoreWarehouseBinLocationData.executeAsync({ code }), {
      loading: 'Restoring bin location...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore bin location!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            binLocations.execute({ warehouseCode })
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

  return (
    <div className='flex h-full w-full flex-col'>
      {!isViewMode ? (
        <div className='flex h-full w-full flex-col'>
          <Toolbar className='mt-5'>
            <CommonPageHeaderToolbarItems
              dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
              dataGridRef={dataGridRef}
              addButton={{
                text: 'Add Bin Location',
                onClick: handleAdd,
                isHide: isBusinessPartner,
                subjects: 'p-warehouses-bin-locations',
                actions: 'create',
                disabled: warehouseSyncStatus === 'synced',
              }}
              exportOptions={{ subjects: 'p-warehouses-bin-locations', actions: 'export' }}
            />
          </Toolbar>

          <div className='min-h-0 flex-1 p-4'>
            <CommonDataGrid
              dataGridRef={dataGridRef}
              data={binLocations.data}
              isLoading={binLocations.isLoading}
              storageKey={DATAGRID_STORAGE_KEY}
              keyExpr='code'
              dataGridStore={dataGridStore}
              callbacks={{ onRowClick: handleView }}
            >
              <Column dataField='BinCode' dataType='string' minWidth={220} caption='Code' sortOrder='asc' />
              <Column dataField='SL1Code' dataType='string' caption='Area' />
              <Column dataField='SL2Code' dataType='string' caption='Location' />
              <Column dataField='SL3Code' dataType='string' caption='Company' />
              <Column dataField='SL4Code' dataType='string' caption='Palette/Box' />
              <Column dataField='Description' dataType='string' caption='Description' />

              <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
                <CanView subject='p-warehouses-bin-locations' action='view'>
                  <DataGridButton
                    icon='eyeopen'
                    onClick={handleView}
                    cssClass='!text-lg'
                    hint='View'
                    visible={(opt) => {
                      const data = opt?.row?.data
                      return hideActionButton(data?.deletedAt || data?.deletedBy || warehouseSyncStatus === 'synced')
                    }}
                  />
                </CanView>

                <CanView subject='p-warehouses-bin-locations' action='edit'>
                  <DataGridButton
                    icon='edit'
                    onClick={handleEdit}
                    cssClass='!text-lg'
                    hint='Edit'
                    visible={(opt) => {
                      const data = opt?.row?.data
                      return hideActionButton(data?.deletedAt || data?.deletedBy || isBusinessPartner || warehouseSyncStatus === 'synced')
                    }}
                  />
                </CanView>

                <CanView subject='p-warehouses-bin-locations' action='delete'>
                  <DataGridButton
                    icon='trash'
                    onClick={handleDelete}
                    cssClass='!text-lg !text-red-500'
                    hint='Delete'
                    visible={(opt) => {
                      const data = opt?.row?.data
                      return hideActionButton(data?.deletedAt || data?.deletedBy || isBusinessPartner || warehouseSyncStatus === 'synced')
                    }}
                  />
                </CanView>

                <CanView subject='p-warehouses-bin-locations' action='restore'>
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

            <Popup visible={isOpen} dragEnabled={false} showTitle={false} onHiding={() => setIsOpen(false)} height={360}>
              <WarehouseBinLocationForm
                warehouseCode={warehouseCode}
                warehouseName={warehouseName}
                setIsOpen={setIsOpen}
                onClose={handleClose}
                binLocation={rowData}
                binLocations={binLocations}
                sublevel1Codes={sublevel1Codes}
                sublevel2Codes={sublevel2Codes}
                sublevel3Codes={sublevel3Codes}
                sublevel4Codes={sublevel4Codes}
              />
            </Popup>

            <AlertDialog
              isOpen={showDeleteConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to delete this bin location with code "${rowData?.BinCode}"?`}
              onConfirm={() => handleConfirmDelete(rowData?.code)}
              onCancel={() => setShowDeleteConfirmation(false)}
            />

            <AlertDialog
              isOpen={showRestoreConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to restore this bin location with code "${rowData?.BinCode}"?`}
              onConfirm={() => handleConfirmRestore(rowData?.code)}
              onCancel={() => setShowRestoreConfirmation(false)}
            />
          </div>
        </div>
      ) : rowData ? (
        <WarehouseBinLocationView warehouseName={warehouseName} data={rowData} onClose={handleClose} />
      ) : null}
    </div>
  )
}
