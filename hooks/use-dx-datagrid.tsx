import { createStoreWithSelectors } from '@/utils/zustand'
import { createWithEqualityFn } from 'zustand/traditional'

export type DataGridStore = {
  showFilterRow: boolean
  setShowFilterRow: (value: boolean) => void
  showHeaderFilter: boolean
  setShowHeaderFilter: (value: boolean) => void
  showFilterBuilderPanel: boolean
  setShowFilterBuilderPanel: (value: boolean) => void
  showGroupPanel: boolean
  setShowGroupPanel: (value: boolean) => void
  enableStateStoring: boolean
  setEnableStateStoring: (value: boolean) => void
  columnHidingEnabled: boolean
  setColumnHidingEnabled: (value: boolean) => void
  showColumnChooser: boolean
  setShowColumnChooser: (value: boolean) => void
  showRowLines: boolean
  setShowRowLines: (value: boolean) => void
  showColumnLines: boolean
  setShowColumnLines: (value: boolean) => void
}

const dataGridStore = createWithEqualityFn<DataGridStore>((set) => ({
  showFilterRow: false,
  setShowFilterRow: (value) => set({ showFilterRow: value }),
  showHeaderFilter: false,
  setShowHeaderFilter: (value) => set({ showHeaderFilter: value }),
  showFilterBuilderPanel: false,
  setShowFilterBuilderPanel: (value) => set({ showFilterBuilderPanel: value }),
  showGroupPanel: false,
  setShowGroupPanel: (value) => set({ showGroupPanel: value }),
  enableStateStoring: true,
  setEnableStateStoring: (value) => set({ enableStateStoring: value }),
  columnHidingEnabled: false,
  setColumnHidingEnabled: (value) => set({ columnHidingEnabled: value }),
  showColumnChooser: false,
  setShowColumnChooser: (value) => set({ showColumnChooser: value }),
  showRowLines: false,
  setShowRowLines: (value) => set({ showRowLines: value }),
  showColumnLines: false,
  setShowColumnLines: (value) => set({ showColumnLines: value }),
}))

export const useDataGridStore = createStoreWithSelectors(dataGridStore)
