'use client'

import { deleleteRole, getRoles, restoreRole } from '@/actions/roles'
import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'
import CanView from '@/components/acl/can-view'
import { hideActionButton, showActionButton } from '@/utils/devextreme'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'

type RoleTableProps = { roles: Awaited<ReturnType<typeof getRoles>> }
type DataSource = Awaited<ReturnType<typeof getRoles>>

export default function RoleTable({ roles }: RoleTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-role'
  const DATAGRID_UNIQUE_KEY = 'roles'

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showRestoreConfirmation, setShowRestoreConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const deleteRoleData = useAction(deleleteRole)
  const restoreRoleData = useAction(restoreRole)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/roles/${data?.code}/view`)
  }, [])

  const handleEdit = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const code = e.row?.data?.code
    if (!code) return
    router.push(`/roles/${code}`)
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

  const handleConfirm = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteRoleData.executeAsync({ code }), {
      loading: 'Deleting role...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete role!', unExpectedError: true }

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
  }

  const handleConfirmRestore = (code?: number) => {
    if (!code) return

    setShowRestoreConfirmation(false)

    toast.promise(restoreRoleData.executeAsync({ code }), {
      loading: 'Restoring role...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to restore role!', unExpectedError: true }

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
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Roles' description='Manage and track your roles effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          addButton={{ text: 'Add Role', onClick: () => router.push('/roles/add'), subjects: 'p-roles', actions: 'create' }}
          exportOptions={{ subjects: 'p-roles', actions: 'export' }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={roles} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' fixed fixedPosition='right' minWidth={140} caption='Actions'>
            <CanView subject='p-roles' action='view'>
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

            <CanView subject='p-roles' action='edit'>
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

            <CanView subject='p-roles' action='delete'>
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

            <CanView subject='p-roles' action='restore'>
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
        description={`Are you sure you want to delete this role named "${rowData?.name}"?`}
        onConfirm={() => handleConfirm(rowData?.code)}
        onCancel={() => setShowDeleteConfirmation(false)}
      />

      <AlertDialog
        isOpen={showRestoreConfirmation}
        title='Are you sure?'
        description={`Are you sure you want to restore this role named "${rowData?.name}"?`}
        onConfirm={() => handleConfirmRestore(rowData?.code)}
        onCancel={() => setShowRestoreConfirmation(false)}
      />
    </div>
  )
}
