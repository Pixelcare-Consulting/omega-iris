'use client'

import Drawer from 'devextreme-react/drawer'
import { Button } from 'devextreme-react/button'
import { Template } from 'devextreme-react/core/template'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TreeView, TreeViewRef, TreeViewTypes } from 'devextreme-react/tree-view'
import { useRouter } from 'nextjs-toploader/app'

import { cn } from '@/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { markSelectedAndExpand, navigation } from '@/constants/menu'
import { usePathname } from 'next/navigation'

export default function DrawerExamplePage() {
  const path = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(true)
  const treeViewRef = useRef<TreeViewRef>(null)

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
    },
    [router]
  )

  //* set initial selected item
  useEffect(() => {
    const updatedItems = markSelectedAndExpand(navigation, path)
    setItems(updatedItems)
  }, [path])

  return (
    <div>
      <header className='flex h-[54px] items-center justify-between px-4 shadow'>
        <div className='flex items-center gap-2'>
          <Button icon='menu' stylingMode='text' onClick={() => setIsOpen((prev) => !prev)} />
          <h1 className='text-2xl font-bold'>Iris</h1>
        </div>
      </header>

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
        <div className={cn('h-[calc(100vh_-_55px)] w-full border-0 p-4', largeMedia && !isOpen && 'border-l')}>SAMPLE DRAWER CONTENT</div>

        <Template name='menu'>
          <div className='mt-[1px] flex h-[calc(100vh_-_55px)] w-[240px] flex-col bg-white shadow-md'>
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
    </div>
  )
}
