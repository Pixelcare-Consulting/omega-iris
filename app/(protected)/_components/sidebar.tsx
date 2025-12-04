'use client'

import Drawer from 'devextreme-react/drawer'
import { Template } from 'devextreme-react/core/template'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TreeView, TreeViewRef, TreeViewTypes } from 'devextreme-react/tree-view'
import { useRouter } from 'nextjs-toploader/app'

import { cn } from '@/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { markSelectedAndExpand, navigation } from '@/constants/menu'
import { usePathname } from 'next/navigation'
import { DxEvent, PointerInteractionEvent } from 'devextreme/events'

type SidebarProps = { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>>; children: React.ReactNode }

export default function Sidebar({ isOpen, setIsOpen, children }: SidebarProps) {
  const path = usePathname()
  const router = useRouter()

  const treeViewRef = useRef<TreeViewRef>(null)
  const autoCloseWhenSmall = useRef<boolean>(false)

  const xSmallMedia = useMediaQuery('(max-width: 575.98px)')
  const largeMedia = useMediaQuery('(min-width: 1200px)')

  const [items, setItems] = useState(navigation)

  const handleOnItemClick = useCallback(
    (e: TreeViewTypes.ItemClickEvent) => {
      const instance = e.component.instance()
      const itemData = e.itemData

      if (itemData && itemData.path) {
        instance.selectItem(e.itemData)
        router.push(itemData.path)
      }

      //* open drawer when item that has children is clicked and unselect items
      if (!isOpen && itemData && itemData.items && itemData.items.length > 0) setIsOpen(true)
    },
    [router, isOpen]
  )

  const handleCloseOnOutsideClick = useCallback(
    (e: DxEvent<PointerInteractionEvent>) => {
      if (e?.target?.className?.includes('dx-drawer-shader')) {
        setIsOpen(false)
        return true
      }
      return false
    },
    [setIsOpen]
  )

  const collapseAllItems = useCallback(() => {
    if (!treeViewRef.current) return
    const instance = treeViewRef?.current?.instance()
    instance.collapseAll()
  }, [JSON.stringify(treeViewRef)])

  //* when screen is below largeMedia, set isOpen to false, only set isOpen when its true not false
  useEffect(() => {
    if (treeViewRef.current && largeMedia !== null && largeMedia === false && isOpen && !autoCloseWhenSmall.current) {
      autoCloseWhenSmall.current = true
      setIsOpen(false)
      collapseAllItems()
    }
  }, [largeMedia, isOpen, treeViewRef])

  //* collapse all items when drawer is closed
  useEffect(() => {
    if (!isOpen && treeViewRef.current) collapseAllItems()
  }, [treeViewRef, isOpen])

  //* set initial selected item
  useEffect(() => {
    const updatedItems = markSelectedAndExpand(navigation, path)
    setItems(updatedItems)
  }, [path])

  return (
    <Drawer
      opened={isOpen}
      revealMode='expand'
      openedStateMode={largeMedia ? 'shrink' : 'overlap'}
      shading={largeMedia ? false : true}
      position='before'
      minSize={xSmallMedia ? 0 : 40}
      maxSize={250}
      template='menu'
    >
      <main
        id='app-main-content'
        className={cn('mt-[2px] h-[calc(100vh_-_54px)] w-full border-0 bg-slate-50 p-4', largeMedia && !isOpen && 'border-l')}
      >
        {children}
      </main>

      <Template name='menu'>
        <div className='mt-[2px] flex h-[calc(100vh_-_54px)] w-[248px] flex-col bg-white shadow-md'>
          <div className='flex min-h-full flex-1 overflow-auto py-2'>
            <TreeView
              className='sidebar-treeview'
              ref={treeViewRef}
              items={items}
              keyExpr='path'
              selectionMode='single'
              focusStateEnabled={false}
              expandEvent='click'
              onItemClick={handleOnItemClick}
              width='100%'
            />
          </div>
        </div>
      </Template>
    </Drawer>
  )
}
