'use client'

import { deleteReport, restoreReport, getReports, markAsDefaultReport } from '@/actions/report'
import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { Item } from 'devextreme-react/toolbar'
import { DropDownButton, Item as DropDownButtonItem } from 'devextreme-react/drop-down-button'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import CanView from '@/components/acl/can-view'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { REPORT_TYPE_LABEL } from '@/schema/report'
import { NotificationContext } from '@/context/notification'
import Tooltip from 'devextreme-react/tooltip'
import Menu from 'devextreme-react/menu'

type ReportTableProps = { reports: Awaited<ReturnType<typeof getReports>> }
type DataSource = Awaited<ReturnType<typeof getReports>>

export default function ReportTable({ reports }: ReportTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-report'
  const DATAGRID_UNIQUE_KEY = 'reports'

  //   const notificationContext = useContext(NotificationContext)

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [showMarkAsDefaultConfirmation, setShowMarkAsDefaultConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const deleteReportData = useAction(deleteReport)
  const restoreReportData = useAction(restoreReport)
  const markAsDefaultReportData = useAction(markAsDefaultReport)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data || !data?.code) return
    router.push(`/reports/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data || !data?.code) return
    router.push(`/reports/${data?.code}?type=${data?.type}`)
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

  const handleMarkAsDefault = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowMarkAsDefaultConfirmation(true)
      setRowData(data)
    },
    [setShowRestoreConfirmation, setRowData]
  )

  const handleConfirmDelete = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteReportData.executeAsync({ code }), {
      loading: 'Deleting report...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete report!', unExpectedError: true }

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

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restoreReportData.executeAsync({ code }), {
      loading: 'Restoring report...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore report!', unExpectedError: true }

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

  const handleConfirmMarkAsDefault = (code?: number, isDefault?: boolean) => {
    if (!code) return

    setShowMarkAsDefaultConfirmation(false)

    toast.promise(markAsDefaultReportData.executeAsync({ code, isDefault: isDefault ?? false }), {
      loading: 'Marking report as default...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to mark report as default!', unExpectedError: true }

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

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Reports' description='Manage and track your reports effectively'>
        <Item location='after' widget='dxDropDownButton'>
          <DropDownButton
            stylingMode='contained'
            type='default'
            icon='add'
            id='add-dropdown-button'
            showArrowIcon={false}
            dropDownOptions={{
              width: 190,
              position: {
                of: '#add-dropdown-button',
                at: 'left bottom',
                offset: '90 42',
              },
            }}
          >
            <DropDownButtonItem text='Add Dashboard' icon='add' onClick={() => router.push('/reports/add?type=1')} />
            <DropDownButtonItem text='Add Paginated' icon='add' onClick={() => router.push('/reports/add?type=2')} />
          </DropDownButton>
        </Item>

        {/* <Item location='after' widget='dxMenu'>
          <Tooltip target='#clear-menu' contentRender={() => 'Add Report'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <Menu
            id='clear-menu'
            dataSource={[
              {
                id: 'add',
                icon: 'add',
                items: [
                  {
                    id: 'add-dashboard',
                    text: 'Add Dashboard',
                    icon: 'add',
                    onClick: () => (window.location.href = '/reports/add?type=1'),
                  },
                  {
                    id: 'add-paginated',
                    text: 'Add Paginated',
                    icon: 'add',
                    onClick: () => (window.location.href = '/reports/add?type=2'),
                  },
                ],
              },
            ]}
            showFirstSubmenuMode='onClick'
            hideSubmenuOnMouseLeave
            onItemClick={(e) => {
              console.log({ e })
            }}
            elementAttr={{
              //* style like button
              class: 'dx-button dx-button-mode-contained dx-button-normal dx-button-has-text dx-button-has-icon [&_.dx-icon]:!mr-0',
            }}
          />
        </Item> */}

        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          exportOptions={{ subjects: 'p-reports', actions: 'export' }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={reports} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='code' minWidth={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='title' dataType='string' caption='Title' />
          <Column dataField='fileName' dataType='string' caption='File Name' />
          <Column dataField='description' dataType='string' caption='Description' />
          <Column
            dataField='type'
            dataType='string'
            caption='Type'
            calculateCellValue={(rowData) => REPORT_TYPE_LABEL?.[rowData.type as '1' | '2']}
          />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          <Column
            dataField='isFeatured'
            dataType='string'
            caption='Featured'
            calculateCellValue={(rowData) => (rowData.isFeatured ? 'Yes' : 'No')}
          />
          <Column
            dataField='isDefault'
            dataType='string'
            caption='Default'
            calculateCellValue={(rowData) => (rowData.isDefault ? 'Yes' : 'No')}
          />
          <Column
            dataField='isInternal'
            dataType='string'
            caption='Internal'
            calculateCellValue={(rowData) => (rowData.isInternal ? 'Yes' : 'No')}
          />

          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' fixed fixedPosition='right' minWidth={150} caption='Actions'>
            <CanView subject='p-reports' action='mark as default'>
              <DataGridButton
                icon='pin'
                onClick={handleMarkAsDefault}
                cssClass='!text-lg !text-blue-500'
                hint='Mark As Default'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy || data?.isDefault)
                }}
              />
            </CanView>

            <CanView subject='p-reports' action='view (owner)'>
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

            <CanView subject='p-reports' action='edit'>
              <DataGridButton
                icon='edit'
                onClick={handleEdit}
                cssClass='!text-lg'
                hint='Edit'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>

            <CanView subject='p-reports' action='delete'>
              <DataGridButton
                icon='trash'
                onClick={handleDelete}
                cssClass='!text-lg !text-red-500'
                hint='Delete'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>

            <CanView subject='p-reports' action='restore'>
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
        description={`Are you sure you want to delete this report titled "${rowData?.title}"?`}
        onConfirm={() => handleConfirmDelete(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this report titled  "${rowData?.title}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />

      <AlertDialog
        isOpen={showMarkAsDefaultConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to mark this report titled  "${rowData?.title}" as default?`}
        onConfirm={() => handleConfirmMarkAsDefault(rowData?.code, true)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />
    </div>
  )
}
