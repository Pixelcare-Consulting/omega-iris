'use client'

import { DataGridRef } from 'devextreme-react/data-grid'
import { Item } from 'devextreme-react/toolbar'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from 'devextreme-react/button'
import { Tooltip } from 'devextreme-react/tooltip'
import { ValueChangedEvent } from 'devextreme/ui/text_box'
import Menu, { MenuTypes } from 'devextreme-react/menu'
import { ChangeEvent, MutableRefObject, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import TextBox, { TextBoxRef } from 'devextreme-react/text-box'
import { exportToExcel } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'

type CommonPageHeaderToolbarItemsProps = {
  dataGridUniqueKey: string
  dataGridRef: MutableRefObject<DataGridRef<any, any> | null>
  isLoading?: boolean
  isEnableImport?: boolean
  importOptions?: { subjects?: string | string[]; actions?: string | string[] }
  exportOptions?: { subjects?: string | string[]; actions?: string | string[] }
  onImport?: (...args: any[]) => void
  addButton?: { text: string; onClick: () => void; subjects?: string | string[]; actions?: string | string[]; disabled?: boolean }
  customs?: { exportToExcel?: (...args: any[]) => void }
}

export default function CommonPageHeaderToolbarItems({
  dataGridUniqueKey,
  dataGridRef,
  isLoading,
  isEnableImport,
  importOptions,
  exportOptions,
  onImport,
  addButton,
  customs,
}: CommonPageHeaderToolbarItemsProps) {
  const searchTextBoxRef = useRef<TextBoxRef | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const exportToExcelMenuItems = useMemo((): MenuTypes.Item[] => {
    return [
      {
        id: 'export',
        icon: 'export',
        items: [
          { id: 'export-all-data-to-excel', text: 'Export all data to Excel', icon: 'xlsxfile' },
          { id: 'export-selected-rows-to-excel', text: 'Export selected rows to Excel', icon: 'exportselected' },
        ],
      },
    ]
  }, [])

  const clearMenuItems = useMemo((): MenuTypes.Item[] => {
    return [
      {
        id: 'clear',
        icon: 'clearformat',
        items: [
          { id: 'clear-filter-row', text: 'Clear Filter Row', icon: 'trash' },
          { id: 'clear-header-filter', text: 'Clear Header Filter', icon: 'trash' },
          { id: 'clear-filter-builder', text: 'Clear Filter Builder', icon: 'trash' },
          { id: 'clear-all-filters', text: 'Clear All Filters', icon: 'trash' },
          { id: 'clear-search', text: 'Clear Search', icon: 'trash' },
          { id: 'clear-grouping', text: 'Clear Grouping', icon: 'trash' },
          { id: 'clear-selection', text: 'Clear Selection', icon: 'trash' },
          { id: 'clear-sorting', text: 'Clear Sorting', icon: 'trash' },
        ],
      },
    ]
  }, [])

  const menuItemOnItemClick = useCallback(
    (e: MenuTypes.ItemClickEvent) => {
      const id = e?.itemData?.id
      const instance = dataGridRef?.current?.instance()

      if (!id || !instance) return

      switch (id) {
        case 'export-all-data-to-excel':
          if (customs?.exportToExcel) {
            customs.exportToExcel(dataGridUniqueKey, instance, false)
            return
          }
          exportToExcel(dataGridUniqueKey, instance, false)
          break
        case 'export-selected-rows-to-excel':
          if (customs?.exportToExcel) {
            customs.exportToExcel(dataGridUniqueKey, instance, true)
            return
          }
          exportToExcel(dataGridUniqueKey, instance, true)
          break
        case 'clear-filter-row':
          instance?.clearFilter('row')
          toast.success('Filter row cleared!xx')
          break
        case 'clear-header-filter':
          instance?.clearFilter('header')
          toast.success('Header filter cleared!')
          break
        case 'clear-filter-builder':
          instance?.clearFilter('filterValue')
          toast.success('Filter builder cleared!')
          break
        case 'clear-all-filters':
          instance?.clearFilter()
          toast.success('All filters cleared!')
          break
        case 'clear-search':
          instance?.searchByText('')
          searchTextBoxRef.current?.instance().clear()
          toast.success('Search cleared!')
          break
        case 'clear-grouping':
          instance?.clearGrouping()
          toast.success('Grouping cleared!')
          break
        case 'clear-selection':
          instance?.clearSelection()
          toast.success('Selection cleared!')
          break
        case 'clear-sorting':
          instance?.clearSorting()
          toast.success('Sorting cleared!')
          break
        default:
          break
      }
    },
    [dataGridRef?.current, searchTextBoxRef?.current]
  )

  const handleColumnChooserOpen = useCallback(() => {
    const instance = dataGridRef?.current?.instance()
    instance?.showColumnChooser()
  }, [])

  const debounceSearch = useDebouncedCallback((e: ValueChangedEvent) => {
    const instance = dataGridRef?.current?.instance()
    instance?.searchByText(e.value)
  }, 1000)

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    //* importing only support xlsx file, only 1 file at a time
    const file = e.target.files?.[0]

    //* check if file exist, if not throw error
    if (!file) {
      toast.error('File not found!')
      return
    }

    //* check if file is xlsx or xls, if not throw error;
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Only .xlsx or .xls file is supported!')
      return
    }

    //TODO: implement import progress loading
    if (onImport) onImport({ file })
  }

  return (
    <>
      {isEnableImport && (
        <Item
          location='after'
          render={() => <input type='file' className='hidden' ref={fileInputRef} onChange={(e) => handleFileUpload(e)} />}
        />
      )}

      {addButton && (
        <CanView subject={addButton?.subjects} action={addButton?.actions}>
          <Item location='after' widget='dxButton'>
            <Tooltip
              target='#add-button'
              contentRender={() => `${addButton.text}`}
              showEvent='mouseenter'
              hideEvent='mouseleave'
              position='top'
            />
            <Button
              id='add-button'
              icon='add'
              type='default'
              stylingMode='contained'
              disabled={isLoading || addButton.disabled}
              onClick={addButton.onClick}
            />
          </Item>
        </CanView>
      )}

      <Item location='after' widget='dxButton'>
        <Tooltip
          target='#toggle-filter-row'
          contentRender={() => 'Toggle Filter Row'}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position='top'
        />
        <Button
          id='toggle-filter-row'
          className={dataGridStore.showFilterRow ? '[&>.dx-button-content>.dx-icon]:text-primary' : ''}
          icon='search'
          disabled={isLoading}
          onClick={() => dataGridStore.setShowFilterRow(!dataGridStore.showFilterRow)}
        />
      </Item>

      <Item location='after' widget='dxButton'>
        <Tooltip
          target='#toggle-header-filter'
          contentRender={() => 'Toggle Header Filter'}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position='top'
        />
        <Button
          id='toggle-header-filter'
          className={dataGridStore.showHeaderFilter ? '[&>.dx-button-content>.dx-icon]:text-primary' : ''}
          icon='filter'
          disabled={isLoading}
          onClick={() => dataGridStore.setShowHeaderFilter(!dataGridStore.showHeaderFilter)}
        />
      </Item>

      <Item location='after' widget='dxMenu'>
        <Tooltip target='#clear-menu' contentRender={() => 'Clear'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
        <Menu
          id='clear-menu'
          dataSource={clearMenuItems}
          showFirstSubmenuMode='onClick'
          hideSubmenuOnMouseLeave
          disabled={isLoading}
          onItemClick={menuItemOnItemClick}
          elementAttr={{
            //* style like button
            class: 'dx-button dx-button-mode-contained dx-button-normal dx-button-has-text dx-button-has-icon [&_.dx-icon]:!mr-0',
          }}
        />
      </Item>

      {isEnableImport && (
        <CanView subject={importOptions?.subjects} action={importOptions?.actions}>
          <Item location='after' widget='dxMenu'>
            <Tooltip target='#import-data' contentRender={() => 'Import'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
            <Button id='import-data' icon='import' disabled={isLoading} onClick={() => fileInputRef.current?.click()} />
          </Item>
        </CanView>
      )}

      <CanView subject={exportOptions?.subjects} action={exportOptions?.actions}>
        <Item location='after' widget='dxMenu'>
          <Tooltip
            target='#export-data-to-file-menu'
            contentRender={() => 'Export'}
            showEvent='mouseenter'
            hideEvent='mouseleave'
            position='top'
          />
          <Menu
            id='export-data-to-file-menu'
            dataSource={exportToExcelMenuItems}
            showFirstSubmenuMode='onClick'
            hideSubmenuOnMouseLeave
            disabled={isLoading}
            onItemClick={menuItemOnItemClick}
            elementAttr={{
              //* style like button
              class: 'dx-button dx-button-mode-contained dx-button-normal dx-button-has-text dx-button-has-icon [&_.dx-icon]:!mr-0',
            }}
          />
        </Item>
      </CanView>

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Filter Builder',
          icon: 'hidepanel',
          disabled: isLoading,
          onClick: () => dataGridStore.setShowFilterBuilderPanel(!dataGridStore.showFilterBuilderPanel),
          elementAttr: {
            class: dataGridStore.showFilterBuilderPanel ? '[&_.dx-icon]:!text-primary [&_.dx-button-text]:text-primary' : '',
          },
        }}
      />

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Gouping',
          icon: 'groupbycolumn',
          disabled: isLoading,
          onClick: () => dataGridStore.setShowGroupPanel(!dataGridStore.showGroupPanel),
          elementAttr: {
            class: dataGridStore.showGroupPanel ? '[&_.dx-icon]:!text-primary [&_.dx-button-text]:text-primary' : '',
          },
        }}
      />

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Auto Column Hiding',
          icon: 'pinleft',
          disabled: isLoading,
          onClick: () => dataGridStore.setColumnHidingEnabled(!dataGridStore.columnHidingEnabled),
          elementAttr: {
            class: dataGridStore.columnHidingEnabled ? '[&_.dx-icon]:!text-primary [&_.dx-button-text]:text-primary' : '',
          },
        }}
      />

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Row Lines',
          icon: 'rowfield',
          disabled: isLoading,
          onClick: () => dataGridStore.setShowRowLines(!dataGridStore.showRowLines),
          elementAttr: {
            class: dataGridStore.showRowLines ? '[&_.dx-icon]:!text-primary [&_.dx-button-text]:text-primary' : '',
          },
        }}
      />

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Column Lines',
          icon: 'columnfield',
          disabled: isLoading,
          onClick: () => dataGridStore.setShowColumnLines(!dataGridStore.showColumnLines),
          elementAttr: {
            class: dataGridStore.showColumnLines ? '[&_.dx-icon]:!text-primary [&_.dx-button-text]:text-primary' : '',
          },
        }}
      />

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          text: 'Show Column Chooser',
          icon: 'columnchooser',
          disabled: isLoading,
          onClick: () => handleColumnChooserOpen(),
        }}
      />

      <Item location='after' widget='dxTextBox'>
        <TextBox
          ref={searchTextBoxRef}
          placeholder='Search'
          onValueChanged={debounceSearch}
          showClearButton
          disabled={isLoading}
          valueChangeEvent='input '
        />
      </Item>
    </>
  )
}
