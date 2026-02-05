import { useNotifications, useUnReadNotificationsCount } from '@/hooks/safe-actions/notification'
import { createContext } from 'react'

type NotificationContextValue = {
  notifications: ReturnType<typeof useNotifications>
  unReadNotificationsCount: ReturnType<typeof useUnReadNotificationsCount>
  handleRefresh: () => void
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)
