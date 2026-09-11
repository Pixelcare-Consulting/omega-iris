'use client'

import { useCallback, useRef } from 'react'
import { Template } from 'devextreme-react/core/template'
import DropDownButton, { type DropDownButtonTypes } from 'devextreme-react/drop-down-button'
import List, { ListRef, type ListTypes } from 'devextreme-react/list'
import { toast } from 'sonner'
import type { SapDatabase } from '@prisma/client'

import { useSapDatabase } from '@/hooks/use-sap-database'
import { useSapDatabases } from '@/hooks/safe-actions/sap-database'
import { Icons } from './icons'

export default function SapDatabaseSwitcher() {
  const listRef = useRef<ListRef>(null)
  const { sapDbCode, isSwitching, switchDatabase } = useSapDatabase()
  const { data: sapDatabases, isLoading } = useSapDatabases()

  const sapDatabase = sapDatabases.find((sapDb) => sapDb.dbCode === sapDbCode) ?? null

  const onItemClick = useCallback(
    async ({ itemData }: ListTypes.ItemClickEvent<SapDatabase>) => {
      if (!itemData || itemData.dbCode === sapDbCode) return

      //* switchDatabase navigates on success
      const { isSwitched, message } = await switchDatabase(itemData.dbCode)

      if (!isSwitched) toast.error(message)
    },
    [sapDbCode, switchDatabase]
  )

  const dropDownButtonContentReady = useCallback(
    ({ component }: DropDownButtonTypes.ContentReadyEvent) => {
      component.registerKeyHandler('downArrow', () => {
        listRef.current?.instance().focus()
      })
    },
    [listRef]
  )

  if (isLoading || !sapDbCode) return null

  return (
    <DropDownButton
      stylingMode='text'
      showArrowIcon={true}
      template='sapDatabaseDropdownButtonTemplate'
      dropDownOptions={{ width: 'auto' }}
      dropDownContentTemplate='dropDownTemplate'
      onContentReady={dropDownButtonContentReady}
      disabled={isSwitching}
    >
      <Template name='sapDatabaseDropdownButtonTemplate'>
        <div className='flex items-center gap-2'>
          <Icons.database className='size-5 text-white' />
          <span className='text-sm font-medium'>{sapDatabase?.name ?? sapDbCode}</span>
        </div>
      </Template>

      <Template name='dropDownTemplate'>
        <div className='px-4 pb-1 pt-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Company</p>
        </div>

        <List
          selectionMode='single'
          items={sapDatabases}
          keyExpr='dbCode'
          displayExpr='name'
          selectedItemKeys={[sapDbCode]}
          ref={listRef}
          onItemClick={onItemClick}
        />
      </Template>
    </DropDownButton>
  )
}
