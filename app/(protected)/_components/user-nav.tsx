'use client'

import { signOut } from 'next-auth/react'
import { useCallback, useMemo, useRef } from 'react'
import { Template } from 'devextreme-react/core/template'
import DropDownButton, { type DropDownButtonTypes } from 'devextreme-react/drop-down-button'
import List, { ListRef, type ListTypes } from 'devextreme-react/list'

import { ExtendedUser } from '@/auth'
import { getInitials, titleCase } from '@/utils'
import { useRouter } from 'nextjs-toploader/app'
import { Badge } from '@/components/badge'

type UserNavProps = { user: ExtendedUser }
type MenuItem = { text: string; icon: string; onClick: () => void }

export default function UserNav({ user }: UserNavProps) {
  const listRef = useRef<ListRef>(null)
  const userFullName = [user.fname, user.lname].filter(Boolean).join(' ')
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({
      redirect: false,
      callbackUrl: '/login',
    })

    window.location.assign('/signin')
  }

  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        text: 'Profile',
        icon: 'user',
        onClick: () => router.push(`/users/${user.code}/profile`),
      },
      {
        text: 'Signout',
        icon: 'runner',
        onClick: handleSignOut,
      },
    ],
    [router, user]
  )

  const onItemClick = useCallback(({ itemData }: ListTypes.ItemClickEvent<MenuItem>) => itemData?.onClick(), [])

  const dropDownButtonContentReady = useCallback(
    ({ component }: DropDownButtonTypes.ContentReadyEvent) => {
      component.registerKeyHandler('downArrow', () => {
        listRef.current?.instance().focus()
      })
    },
    [listRef]
  )

  return (
    <DropDownButton
      stylingMode='text'
      showArrowIcon={false}
      template='userDropdownButtonTemplate'
      dropDownOptions={{ width: 'auto' }}
      dropDownContentTemplate='dropDownTemplate'
      onContentReady={dropDownButtonContentReady}
    >
      <Template name='userDropdownButtonTemplate'>
        <div>{getInitials(userFullName).toUpperCase()}</div>
      </Template>

      <Template name='dropDownTemplate'>
        <div className='flex flex-col items-center justify-center gap-y-2 p-4'>
          <div className='rounded-ful relative flex h-10 w-10 shrink-0 overflow-hidden'>
            <div className='flex h-full w-full items-center justify-center rounded-full border bg-slate-100'>
              {getInitials(userFullName).toUpperCase()}
            </div>
          </div>

          <p className='text-sm font-bold leading-none'>{titleCase(userFullName)}</p>
          <p className='text-muted-foreground text-xs leading-none text-slate-500'>{user.email}</p>
          <Badge className='w-fit'>{user.roleName}</Badge>
        </div>
        <List selectionMode='single' items={menuItems} ref={listRef} onItemClick={onItemClick} />
      </Template>
    </DropDownButton>
  )
}
