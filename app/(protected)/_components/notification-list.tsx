'use client'

import { Icons } from '@/components/icons'
import { cn } from '@/utils'
import { formatRelative } from 'date-fns'
import ScrollView from 'devextreme-react/scroll-view'
import Link from 'next/link'

import DropDownButton, { Item } from 'devextreme-react/drop-down-button'
import { useNotifications } from '@/hooks/safe-actions/notification'

type NotificationListProps = {
  notifications?: ReturnType<typeof useNotifications>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  isLoading?: boolean
  handleToggleRead: (notificationCode: number, isRead: boolean, disableToast?: boolean) => Promise<void>
  handleDelete: (data: ReturnType<typeof useNotifications>['data'][number]) => void
}

export default function NotificationList({ notifications, setIsOpen, isLoading, handleToggleRead, handleDelete }: NotificationListProps) {
  if (!notifications) return null

  if (notifications.data.length < 1) {
    return (
      <div className='flex h-[200px] items-center justify-center'>
        <div className='flex flex-col items-center justify-center'>
          <Icons.xCircle className='size-7 text-red-500' />
          <div className='mt-2.5 flex flex-col items-center justify-center gap-1'>
            <h1 className='text-center text-base font-bold text-red-500'>No Notifications Yet</h1>
            <p className='text-center text-xs text-slate-500 dark:text-slate-400'>You have no notifications right now.</p>
            <p className='text-center text-xs text-slate-500 dark:text-slate-400'>Come back later.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      <ScrollView height={500}>
        <div className='divide-y'>
          {notifications.data.map((nItem) => {
            const Comp = nItem?.link ? Link : 'div'
            const isRead = nItem.receipts.some((r) => r.readAt !== null)

            return (
              <div className='flex items-center gap-3 py-4' key={nItem.id}>
                <div className='d-flex justify-content-center align-items-center' style={{ width: '10%' }}>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-full border bg-slate-100'>
                    <Icons.msgSquareText className='size-5 text-slate-400' />
                  </div>
                </div>

                <Comp
                  href={nItem?.link ?? '#'}
                  className={cn('inline-flex flex-1 flex-col gap-0.5', !nItem.link ? 'pointer-events-none' : '')}
                  onClick={() => {
                    handleToggleRead(nItem.code, !isRead, true)
                    setIsOpen(false)
                  }}
                >
                  <h2 className='text-sm font-semibold'>{nItem.title}</h2>
                  <p className='line-clamp-3 text-ellipsis text-xs text-slate-400'>{nItem.message}</p>
                  <small className='text-xs font-medium text-primary'>
                    {nItem.createdAt ? formatRelative(nItem.createdAt, new Date()) : ''}
                  </small>
                </Comp>

                <div className={cn('size-2 shrink-0 rounded-full', isRead ? 'bg-transparent' : 'bg-primary')} />

                <div className='w-fit shrink-0' id={`notification-dropdown-${nItem.id}`}>
                  <DropDownButton
                    className='pr-2'
                    icon='overflow'
                    showArrowIcon={false}
                    dropDownOptions={{
                      width: 190,
                      position: {
                        of: `#notification-dropdown-${nItem.id}`,
                        my: 'right',
                        at: 'center',
                        offset: '-25 0',
                      },
                    }}
                  >
                    <Item
                      text={`Mark as ${isRead ? 'Unread' : 'Read'}`}
                      icon={`${isRead ? 'close' : 'check'}`}
                      onClick={() => handleToggleRead(nItem.code, !isRead)}
                      disabled={isLoading}
                    />
                    <Item text='Delete Notification' icon='trash' onClick={() => handleDelete(nItem)} disabled={isLoading} />
                  </DropDownButton>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollView>
    </div>
  )
}
