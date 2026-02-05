'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import Button from 'devextreme-react//button'
import Popup from 'devextreme-react/popup'
import NotificationList from './notification-list'
import Link from 'next/link'
import { cn } from '@/utils'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import TooltipWrapper from '@/components/tooltip-wrapper'
import { useNotifications, useUnReadNotificationsCount } from '@/hooks/safe-actions/notification'
import { deleteNotification, toggleAllNotificationsRead, toggleNotificationRead } from '@/actions/notification'
import AlertDialog from '@/components/alert-dialog'
import { REFRESH_INTERVAL } from '@/constants/notification'
import { NotificationContext } from '@/context/notification'

const NOTIFICATIONS = [
  {
    id: 1,
    link: '/users',
    title: 'New user registration',
    message:
      'New user registered with username: johndoe  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla bibendum scelerisque fermentum. Quisque ac aliquet tellus. Vestibulum eu leo tellus.',
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 2,
    title: 'Password changed',
    message: 'User janedoe has changed their password',
    createdAt: new Date('2026-01-05'),
  },
  {
    id: 3,
    title: 'New order received',
    message: 'Order #1024 has been placed by user alex123',
    createdAt: new Date('2026-01-07'),
  },
  {
    id: 4,
    title: 'Subscription expired',
    message: 'User mike88 subscription expired today',
    createdAt: new Date('2026-01-08'),
  },
  {
    id: 5,
    title: 'New comment',
    message: 'User sarah98 commented on your post',
    createdAt: new Date('2026-01-09'),
  },
  {
    id: 6,
    title: 'System alert',
    message: 'Server CPU usage exceeded 80%',
    createdAt: new Date('2026-01-10'),
  },
  {
    id: 7,
    title: 'Profile updated',
    message: 'User tom_smith updated profile information',
    createdAt: new Date('2026-01-11'),
  },
  {
    id: 8,
    title: 'New message received',
    message: 'User lily90 sent you a new message',
    createdAt: new Date('2026-01-12'),
  },
  {
    id: 9,
    title: 'Payment received',
    message: 'Payment of $49.99 received from user maxpay',
    createdAt: new Date('2026-01-13'),
  },
  {
    id: 10,
    title: 'Account locked',
    message: 'User robert23 account locked due to multiple failed login attempts',
    createdAt: new Date('2026-01-14'),
  },
]

export default function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [rowData, setRowData] = useState<ReturnType<typeof useNotifications>['data'][number] | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const notificationContext = useContext(NotificationContext)

  const toggleNotificationReadData = useAction(toggleNotificationRead)
  const toggleAllNotificationsReadData = useAction(toggleAllNotificationsRead)
  const deleteNotificationData = useAction(deleteNotification)

  const isLoading = useMemo(() => {
    return (
      notificationContext?.notifications.isLoading ||
      notificationContext?.unReadNotificationsCount.isLoading ||
      toggleNotificationReadData.isExecuting ||
      toggleAllNotificationsReadData.isExecuting ||
      deleteNotificationData.isExecuting
    )
  }, [
    notificationContext?.notifications.isLoading,
    notificationContext?.unReadNotificationsCount.isLoading,
    toggleNotificationReadData.isExecuting,
    toggleAllNotificationsReadData.isExecuting,
    deleteNotificationData.isExecuting,
  ])

  const isReadAll = useMemo(() => {
    if (notificationContext?.unReadNotificationsCount.isLoading) return false
    return notificationContext?.unReadNotificationsCount.data === 0
  }, [JSON.stringify(notificationContext?.unReadNotificationsCount)])

  const handleHideOnOutsideClick = () => {
    setIsOpen(false)
    return true
  }

  const handleRefresh = () => {
    notificationContext?.notifications.execute({ limit: 10 })
    notificationContext?.unReadNotificationsCount.execute()
  }

  const handleToggleRead = async (notificationCode: number, isRead: boolean, disableToast = false) => {
    try {
      const response = await toggleNotificationReadData.executeAsync({ notificationCode, isRead })
      const result = response?.data

      if (result?.error) {
        if (!disableToast) toast.error(result.message)
        return
      }

      if (!disableToast) toast.success(result?.message)

      if (result?.status === 200) handleRefresh()
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
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

  const handleDelete = (data: ReturnType<typeof useNotifications>['data'][number]) => {
    setShowDeleteConfirmation(true)
    setRowData(data)
  }

  const handleConfirmDelete = async (code: number) => {
    try {
      setShowDeleteConfirmation(false)

      const response = await deleteNotificationData.executeAsync({ code })
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

  return (
    <>
      <div className='relative'>
        <Button icon='belloutline' stylingMode='text' onClick={() => setIsOpen((prev) => !prev)} disabled={isLoading} />
        <div
          className={cn(
            'dx-badge absolute -right-1 -top-1 z-[200]',
            (notificationContext?.unReadNotificationsCount.data ?? 0) < 1 ? 'hidden' : ''
          )}
        >
          {notificationContext?.unReadNotificationsCount.isLoading ? '...' : notificationContext?.unReadNotificationsCount.data}
        </div>
      </div>

      <Popup
        visible={isOpen}
        dragEnabled={false}
        showCloseButton={false}
        showTitle={false}
        width={520}
        height='auto'
        hideOnOutsideClick={handleHideOnOutsideClick}
        position={{ my: 'top', at: 'right', of: '#app-header', offset: '-275 35' }}
        shading={false}
        className='bg-red-500'
      >
        <div className='flex flex-col'>
          {/* //* header */}
          <div className='flex items-center justify-between border-b pb-4'>
            <h1 className='text-base font-semibold'>Notifications</h1>
            <div className='flex items-center gap-1'>
              <Button
                icon='checkmarkcircle'
                stylingMode='outlined'
                type='normal'
                text={`Mark All as ${isReadAll ? 'Unread' : 'Read'}`}
                disabled={isLoading || (notificationContext?.notifications?.data?.length ?? 0) < 1}
                onClick={() => handleToggleReadAll(isReadAll ? false : true)}
              />

              <TooltipWrapper label='Refresh' targetId='notification-refresh-button'>
                <Button icon='refresh' stylingMode='contained' type='default' disabled={isLoading} onClick={handleRefresh} />
              </TooltipWrapper>
            </div>
          </div>

          {/* //* body */}
          <NotificationList
            notifications={notificationContext?.notifications}
            setIsOpen={setIsOpen}
            isLoading={isLoading}
            handleToggleRead={handleToggleRead}
            handleDelete={handleDelete}
          />

          {/* //* footer */}
          {(notificationContext?.notifications.data.length ?? 0) > 0 && (
            <div className={cn('border-t pt-4 text-center', isLoading ? 'pointer-events-none opacity-50' : '')}>
              <Link className='hover:text-primary hover:underline' href='/notifications' onClick={() => setIsOpen(false)}>
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      </Popup>

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
    </>
  )
}
