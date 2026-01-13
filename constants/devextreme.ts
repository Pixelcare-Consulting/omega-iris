import { DataGridStore } from '@/hooks/use-dx-datagrid'

export const DATAGRID_PAGE_SIZES = [10, 25, 50, 75, 100]
export const DATAGRID_DEFAULT_PAGE_SIZE = 10
export const DEFAULT_CURRENCY_FORMAT = '#,##0.00'
export const DEFAULT_NUMBER_FORMAT = '#,##0'
export const DEFAULT_COLUMN_MIN_WIDTH = 250

export const COMMON_DATAGRID_STORE_KEYS: (keyof DataGridStore)[] = [
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
  'showRowLines',
  'setShowRowLines',
  'showColumnLines',
  'setShowColumnLines',
]
