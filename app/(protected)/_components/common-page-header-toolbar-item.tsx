'use client'

import { DataGridRef } from 'devextreme-react/data-grid'
import { Item } from 'devextreme-react/toolbar'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from 'devextreme-react/button'
import { Tooltip } from 'devextreme-react/tooltip'
import { ValueChangedEvent } from 'devextreme/ui/text_box'
import Menu, { MenuTypes } from 'devextreme-react/menu'
import { MutableRefObject, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import TextBox, { TextBoxRef } from 'devextreme-react/text-box'
import { exportToExcel } from '@/utils/devextreme'

type CommonPageHeaderToolbarItemsProps = {
  dataGridUniqueKey: string
  dataGridRef: MutableRefObject<DataGridRef<any, any> | null>
  addButton?: { text: string; onClick: () => void }
  customs?: {
    exportToExcel?: (...args: any[]) => void
  }
}

export default function CommonPageHeaderToolbarItems({
  dataGridUniqueKey,
  dataGridRef,
  addButton,
  customs,
}: CommonPageHeaderToolbarItemsProps) {
  const searchTextBoxRef = useRef<TextBoxRef | null>(null)

  const dataGridStore = useDataGridStore([
    'showFilterRow',
    'setShowFilterRow',
    'showHeaderFilter',
    'setShowHeaderFilter',
    'showFilterBuilderPanel',
    'setShowFilterBuilderPanel',
    'showGroupPanel',
    'setShowGroupPanel',
    'enableStateStoring',
    'columnHidingEnabled',
    'setColumnHidingEnabled',
    'showColumnChooser',
    'setShowColumnChooser',
  ])

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

  return (
    <>
      {addButton && (
        <Item location='after' widget='dxButton'>
          <Tooltip
            target='#add-button'
            contentRender={() => `${addButton.text}`}
            showEvent='mouseenter'
            hideEvent='mouseleave'
            position='top'
          />
          <Button id='add-button' icon='add' type='default' stylingMode='contained' onClick={addButton.onClick} />
        </Item>
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
          onItemClick={menuItemOnItemClick}
          elementAttr={{
            //* style like button
            class: 'dx-button dx-button-mode-contained dx-button-normal dx-button-has-text dx-button-has-icon [&_.dx-icon]:!mr-0',
          }}
        />
      </Item>

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
          onItemClick={menuItemOnItemClick}
          elementAttr={{
            //* style like button
            class: 'dx-button dx-button-mode-contained dx-button-normal dx-button-has-text dx-button-has-icon [&_.dx-icon]:!mr-0',
          }}
        />
      </Item>

      <Item
        location='after'
        widget='dxButton'
        locateInMenu='always'
        options={{
          //* should be declared this way to avoid to resolve issue with toolbar item with locateInMenu='always' for button
          text: 'Toggle Filter Builder',
          icon: 'hidepanel',
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
          stylingMode: 'text',
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
          text: 'Show Column Chooser',
          icon: 'columnchooser',
          onClick: () => handleColumnChooserOpen(),
        }}
      />

      <Item location='after' widget='dxTextBox'>
        <TextBox ref={searchTextBoxRef} placeholder='Search' onValueChanged={debounceSearch} showClearButton valueChangeEvent='input ' />
      </Item>
    </>
  )
}
