'use client'

import { REFRESH_INTERVAL } from '@/constants/notification'
import { NotificationContext } from '@/context/notification'
import { useNotifications, useUnReadNotificationsCount } from '@/hooks/safe-actions/notification'
import { useCallback, useEffect } from 'react'

type NotificationProviderProps = { children: React.ReactNode }

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const notifications = useNotifications(10)
  const unReadNotificationsCount = useUnReadNotificationsCount()

  const handleRefresh = useCallback(() => {
    notifications.execute({ limit: 10 })
    unReadNotificationsCount.execute()
  }, [notifications.execute, unReadNotificationsCount.execute])

  useEffect(() => {
    //* refresh notifications every REFRESH_INTERVAL
    const interval = setInterval(() => {
      handleRefresh()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, unReadNotificationsCount, handleRefresh }}>
      {children}
    </NotificationContext.Provider>
  )
}
