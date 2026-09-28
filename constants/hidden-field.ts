import { MODULE_NAME, ModuleName } from '@/constants/module'
import { PROJECT_ITEM_COLUMNS_MAP } from '@/constants/project-item'

type HiddenFieldModule = {
  moduleName: ModuleName
  label: string
  description: string
  columns: Record<string, string> //* field key -> column caption
}

//* modules whose fields can be hidden per user, add an entry here to show it in the user form
export const HIDDEN_FIELD_MODULES: HiddenFieldModule[] = [
  {
    moduleName: MODULE_NAME.PROJECT_ITEMS,
    label: 'Project Inventory',
    description: 'Columns and fields hidden from this user in the project inventory',
    columns: PROJECT_ITEM_COLUMNS_MAP,
  },
]
