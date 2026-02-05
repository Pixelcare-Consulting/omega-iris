'use client'

import { Column, DataGridRef } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import { Item } from 'devextreme-react/toolbar'
import Tooltip from 'devextreme-react/tooltip'

import { getNotifications, toggleNotificationRead, toggleAllNotificationsRead, deleteNotification } from '@/actions/notification'
import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import AlertDialog from '@/components/alert-dialog'
import CommonDataGrid from '@/components/common-datagrid'

import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import Button from 'devextreme-react/cjs/button'
import { splitCamelCase } from '@/utils'
import { NotificationContext } from '@/context/notification'

type NotificationTableProps = { notifications: Awaited<ReturnType<typeof getNotifications>> }
type DataSource = Awaited<ReturnType<typeof getNotifications>>

export default function NotificationTable({ notifications }: NotificationTableProps) {
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-notification'
  const DATAGRID_UNIQUE_KEY = 'notifications'

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [rowData, setRowData] = useState<DataSource[number] | null>(null)
  const dataGridRef = useRef<DataGridRef | null>(null)

  const toggleNotificationReadData = useAction(toggleNotificationRead)
  const toggleAllNotificationsReadData = useAction(toggleAllNotificationsRead)
  const deleteNotificationData = useAction(deleteNotification)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const notificationContext = useContext(NotificationContext)
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'read' | 'unread'>('all')

  const isReadAll = useMemo(() => {
    if (notificationContext?.unReadNotificationsCount.isLoading) return false
    return notificationContext?.unReadNotificationsCount.data === 0
  }, [JSON.stringify(notificationContext?.unReadNotificationsCount)])

  const isLoading = useMemo(() => {
    return (
      notificationContext?.unReadNotificationsCount.isLoading ||
      toggleNotificationReadData.isExecuting ||
      toggleAllNotificationsReadData.isExecuting ||
      deleteNotificationData.isExecuting
    )
  }, [
    notificationContext?.unReadNotificationsCount.isLoading,
    toggleNotificationReadData.isExecuting,
    toggleAllNotificationsReadData.isExecuting,
    deleteNotificationData.isExecuting,
  ])

  const filterByRead = useCallback(() => {
    if (!dataGridRef.current) return
    const intance = dataGridRef.current.instance()
    intance.filter(['receipts[0].readAt', '<>', null])
    setNotificationFilter('read')
  }, [JSON.stringify(dataGridRef)])

  const filterByUnRead = useCallback(() => {
    if (!dataGridRef.current) return
    const intance = dataGridRef.current.instance()
    intance.filter(['receipts[0].readAt', '=', null])
    setNotificationFilter('unread')
  }, [JSON.stringify(dataGridRef)])

  const filterByAll = useCallback(() => {
    if (!dataGridRef.current) return
    const intance = dataGridRef.current.instance()
    intance.clearFilter()
    setNotificationFilter('all')
  }, [JSON.stringify(dataGridRef)])

  const handleRefresh = () => {
    notificationContext?.handleRefresh()
    notificationContext?.unReadNotificationsCount?.execute()
    router.refresh()
  }

  const handleToggleRead = (notificationCode: number, isRead: boolean) => {
    if (!notificationCode) return

    toast.promise(toggleNotificationReadData.executeAsync({ notificationCode, isRead }), {
      loading: `Marking notification as ${isRead ? 'unread' : 'read'}...`,
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: `Failed to mark notification as ${isRead ? 'unread' : 'read'}!`, unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            handleRefresh()
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

  const handleToggleReadAll = async (isRead: boolean) => {
    try {
      const response = await toggleAllNotificationsReadData.executeAsync({ isRead })
      const result = response?.data

      if (result?.error) {
        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.status === 200) handleRefresh()
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleView = (notificationCode: number, isRead: boolean, link?: string | null) => {
    if (!link) return

    toggleNotificationReadData
      .executeAsync({ notificationCode, isRead })
      .then(() => {
        handleRefresh()

        setTimeout(() => {
          router.push(link)
        }, 500)
      })
      .catch((error: any) => {
        console.error(error.message)
        toast.error('Failed to view notification!')
      })
  }

  const handleDelete = (data: DataSource[number]) => {
    if (!data) return
    setShowDeleteConfirmation(true)
    setRowData(data)
  }

  const handleConfirmDelete = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteNotificationData.executeAsync({ code }), {
      loading: 'Deleting notification...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete notification!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            handleRefresh()
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

  const renderTooltips = () => {
    return (
      <>
        <Tooltip
          target='#notification-all-filter-button'
          contentRender={() => 'All Notifications'}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position='top'
        />

        <Tooltip
          target='#notification-read-filter-button'
          contentRender={() => 'Read Notifications'}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position='top'
        />

        <Tooltip
          target='#notification-unread-filter-button'
          contentRender={() => 'Unread Notifications'}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position='top'
        />
      </>
    )
  }

  //* trigger router.refresh if notificationContext.notifications & notificationContext.unReadNotificationsCount was changed
  useEffect(() => {
    router.refresh()
  }, [JSON.stringify(notificationContext?.notifications?.data), JSON.stringify(notificationContext?.unReadNotificationsCount?.data)])

  return (
    <div className='h-full w-full space-y-5'>
      {renderTooltips()}

      <PageHeader title='Notifications' description='Manage and track your notifications effectively'>
        <Item
          location='after'
          widget='dxButton'
          options={{
            icon: 'checkmarkcircle',
            stylingMode: 'text',
            type: 'default',
            text: `Mark All as ${isReadAll ? 'Unread' : 'Read'}`,
            disabled: isLoading || notifications.length < 1,
            onClick: () => handleToggleReadAll(isReadAll ? false : true),
          }}
        />

        <Item
          location='after'
          widget='dxButton'
          options={{
            elementAttr: { id: 'notification-all-filter-button' },
            icon: 'belloutline',
            stylingMode: notificationFilter === 'all' ? 'contained' : 'outlined',
            type: 'default',
            text: `${notifications.length}`,
            disabled: isLoading || notifications.length < 1,
            onClick: filterByAll,
          }}
        />

        <Item
          location='after'
          widget='dxButton'
          options={{
            elementAttr: { id: 'notification-read-filter-button' },
            icon: 'check',
            stylingMode: notificationFilter === 'read' ? 'contained' : 'outlined',
            type: 'default',
            text: `${notificationContext?.unReadNotificationsCount.isLoading ? '...' : `${notifications.length - (notificationContext?.unReadNotificationsCount.data ?? 0)}`}`,
            disabled: isLoading || notifications.length < 1,
            onClick: filterByRead,
          }}
        />

        <Item
          location='after'
          widget='dxButton'
          options={{
            elementAttr: { id: 'notification-unread-filter-button' },
            icon: 'close',
            stylingMode: notificationFilter === 'unread' ? 'contained' : 'outlined',
            type: 'default',
            text: `${notificationContext?.unReadNotificationsCount.isLoading ? '...' : `${notificationContext?.unReadNotificationsCount.data}`}`,
            disabled: isLoading || notifications.length < 1,
            onClick: filterByUnRead,
          }}
        />

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid dataGridRef={dataGridRef} data={notifications} storageKey={DATAGRID_STORAGE_KEY} dataGridStore={dataGridStore}>
          <Column dataField='title' dataType='string' caption='Title' />
          <Column dataField='message' minWidth={250} dataType='string' caption='Message' />
          <Column
            dataField='entityType'
            dataType='string'
            caption='Module'
            calculateCellValue={(rowData) => splitCamelCase(rowData.entityType)}
          />
          <Column dataField='createdAt' minWidth={150} dataType='datetime' caption='Created At' sortOrder='desc' />
          <Column dataField='receipts[0].readAt' minWidth={150} dataType='datetime' caption='Read At' />

          <Column
            type='buttons'
            fixed
            fixedPosition='right'
            minWidth={140}
            caption='Actions'
            cellRender={(e) => {
              const data = e.data as DataSource[number]
              const isRead = data.receipts.some((r) => r.readAt !== null)

              return (
                <div className='flex items-center justify-center -space-x-1.5'>
                  <Button
                    className='!size-5 !bg-transparent p-0 [&_.dx-button-content]:p-0 [&_.dx-icon]:!text-[18px]'
                    icon='eyeopen'
                    hint='View'
                    type='text'
                    onClick={() => handleView(data.code, !isRead, data.link)}
                  />

                  <Button
                    className='!size-5 !bg-transparent p-0 [&_.dx-button-content]:p-0 [&_.dx-icon]:!text-[18px]'
                    icon={`${isRead ? 'close' : 'check'}`}
                    hint={`Mark as ${isRead ? 'Unread' : 'Read'}`}
                    type='text'
                    onClick={() => handleToggleRead(data.code, !isRead)}
                  />

                  {/* <Button
                    className='!size-5 !bg-transparent p-0 [&_.dx-button-content]:p-0 [&_.dx-icon]:!text-[18px] [&_.dx-icon]:!text-red-500'
                    icon='trash'
                    type='text'
                    hint='Delete'
                    onClick={() => handleDelete(data)}
                  /> */}
                </div>
              )
            }}
          />
        </CommonDataGrid>

        <AlertDialog
          isOpen={showDeleteConfirmation}
          title='Are you sure?'
          description='Are you sure you want to delete this notification?'
          onConfirm={() => handleConfirmDelete(rowData?.code ?? -1)}
          onCancel={() => {
            setShowDeleteConfirmation(false)
            setRowData(null)
          }}
        />
      </PageContentWrapper>
    </div>
  )
}
