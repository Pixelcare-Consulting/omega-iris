import { createStoreWithSelectors } from '@/utils/zustand'
import { createWithEqualityFn } from 'zustand/traditional'

type DataGridStore = {
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
  enableStateStoring: false,
  setEnableStateStoring: (value) => set({ enableStateStoring: value }),
  columnHidingEnabled: false,
  setColumnHidingEnabled: (value) => set({ columnHidingEnabled: value }),
  showColumnChooser: false,
  setShowColumnChooser: (value) => set({ showColumnChooser: value }),
}))

export const useDataGridStore = createStoreWithSelectors(dataGridStore)
