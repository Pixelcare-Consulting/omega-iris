export type NavItem = {
  id: string
  text: string
  icon?: string
  path?: string
  selected?: boolean
  expanded?: boolean
  items?: NavItem[]
}

export const navigation: NavItem[] = [
  {
    id: '0',
    text: 'Dashboard',
    icon: 'mediumiconslayout',
    path: '/dashboard',
    selected: false,
  },
  {
    id: '1',
    text: 'Users',
    icon: 'user',
    path: '/users',
    selected: false,
    expanded: false,
  },
  {
    id: '2',
    text: 'Security',
    icon: 'lock',
    selected: false,
    items: [
      {
        id: '2_1',
        text: 'Roles',
        path: '/security/roles',
        selected: false,
        expanded: false,
      },
      {
        id: '2_2',
        text: 'Permissions',
        path: '/security/permissions',
        selected: false,
        expanded: false,
      },
    ],
  },
  {
    id: '3',
    text: 'Settings',
    icon: 'optionsgear',
    path: '/settings',
    selected: false,
    expanded: false,
  },
  {
    id: '4',
    text: 'Projects',
    icon: 'folder',
    selected: false,
    expanded: false,
    items: [
      {
        id: '4_2',
        text: 'Groups',
        path: '/project/groups',
        selected: false,
        expanded: false,
      },
      {
        id: '4_1',
        text: 'Individuals',
        path: '/project/individuals',
        selected: false,
        expanded: false,
      },
    ],
  },
  {
    id: '5',
    text: 'Warehouses',
    icon: 'home',
    path: '/warehouses',
    selected: false,
    expanded: false,
  },
  {
    id: '6',
    text: 'Inventory',
    icon: 'packagebox',
    path: '/inventory',
    selected: false,
    expanded: false,
  },
  {
    id: '7',
    text: 'Work Orders',
    icon: 'cardcontent',
    path: '/work-orders',
    selected: false,
    expanded: false,
  },
  {
    id: '8',
    text: 'Reporting',
    icon: 'datausage',
    path: '/reporting',
    selected: false,
    expanded: false,
  },
  {
    id: '9',
    text: 'Logs',
    icon: 'ordersbox',
    path: '/logs',
    selected: false,
    expanded: false,
  },
]

export function markSelectedAndExpand(items: NavItem[], path: string): NavItem[] {
  return items.map((item) => {
    const newItem = { ...item, expanded: false, selected: false }

    //* Check if this is the matching item
    if (item.path && (item.path === path || path.startsWith(item.path))) {
      newItem.selected = true
    }

    //* Recursively process children
    if (item.items?.length) {
      const updatedChildren = markSelectedAndExpand(item.items, path)
      newItem.items = updatedChildren

      //* If any child is selected or expanded, expand this parent
      if (updatedChildren.some((child) => child.selected || child.expanded)) {
        newItem.expanded = true
      }
    }

    return newItem
  })
}

export function findNavItemByPath(items: NavItem[], path: string): NavItem | null {
  for (const item of items) {
    if (item.path && (item.path === path || path.startsWith(item.path)) && item.path) return { ...item, selected: true, expanded: true }
    if (item.items && item.items.length > 0) {
      const found = findNavItemByPath(item.items, path)
      if (found) return found
    }
  }
  return null
}

export function clearNavText(items: NavItem[]): NavItem[] {
  return items.map((item) => {
    const updatedItem: NavItem = {
      ...item,
      text: '', //* clear the text
    }

    if (item.items && item.items.length > 0) {
      updatedItem.items = clearNavText(item.items)
    }

    return updatedItem
  })
}

export function unselectAllNavItems(items: NavItem[]): NavItem[] {
  return items.map((item) => {
    const updatedItem: NavItem = {
      ...item,
      selected: false,
    }

    if (item.items && item.items.length > 0) {
      updatedItem.items = unselectAllNavItems(item.items)
    }

    return updatedItem
  })
}
