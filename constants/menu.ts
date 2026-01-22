import { AnyAbility } from '@casl/ability'
import { v4 as uuidv4 } from 'uuid'

export type NavItem = {
  id: string
  text: string
  icon?: string
  path?: string
  selected?: boolean
  expanded?: boolean
  items?: NavItem[]
  subjects?: string | string[]
  actions?: string | string[]
}

export const navigation: NavItem[] = [
  {
    id: uuidv4(),
    text: 'Dashboard',
    icon: 'mediumiconslayout',
    path: '/dashboard',
    selected: false,
    subjects: 'p-dashboard',
    actions: ['view', 'view (owner)'],
  },
  {
    id: uuidv4(),
    text: 'Users',
    icon: 'user',
    path: '/users',
    selected: false,
    expanded: false,
    subjects: 'p-users',
    actions: ['view', 'view (owner)'],
  },
  {
    id: uuidv4(),
    text: 'Roles',
    icon: 'group',
    path: '/roles',
    selected: false,
    expanded: false,
    subjects: 'p-roles',
    actions: ['view', 'view (owner)'],
  },
  // {
  //   id: uuidv4(),
  //   text: 'Settings',
  //   icon: 'optionsgear',
  //   path: '/settings',
  //   selected: false,
  //   expanded: false,
  //   subjects: 'p-settings',
  //   actions: ['view', 'view (owner)'],
  // },
  {
    id: uuidv4(),
    text: 'Customers',
    icon: 'group',
    path: '/customers',
    selected: false,
    expanded: false,
    subjects: 'p-customers',
    actions: ['view', 'view (owner)'],
  },
  {
    id: uuidv4(),
    text: 'Projects',
    icon: 'folder',
    selected: false,
    expanded: false,
    subjects: ['p-projects-groups', 'p-projects-individuals'],
    actions: ['view', 'view (owner)'],
    items: [
      {
        id: uuidv4(),
        text: 'Groups',
        path: '/project/groups',
        selected: false,
        expanded: false,
        subjects: 'p-projects-groups',
        actions: ['view', 'view (owner)'],
      },
      {
        id: uuidv4(),
        text: 'Individuals',
        path: '/project/individuals',
        selected: false,
        expanded: false,
        subjects: 'p-projects-individuals',
        actions: ['view', 'view (owner)'],
      },
    ],
  },
  // {
  //   id: uuidv4(),
  //   text: 'Warehouses',
  //   icon: 'home',
  //   path: '/warehouses',
  //   selected: false,
  //   expanded: false,
  //   subjects: 'p-warehouses',
  //   actions: 'view',
  // },
  {
    id: uuidv4(),
    text: 'Inventory',
    icon: 'packagebox',
    path: '/inventory',
    selected: false,
    expanded: false,
    subjects: 'p-inventory',
    actions: ['view', 'view (owner)'],
  },
  {
    id: uuidv4(),
    text: 'Work Orders',
    icon: 'cardcontent',
    path: '/work-orders',
    selected: false,
    expanded: false,
    subjects: 'p-work-orders',
    actions: ['view', 'view (owner)'],
  },
  // {
  //   id: uuidv4(),
  //   text: 'Reporting',
  //   icon: 'datausage',
  //   path: '/reporting',
  //   selected: false,
  //   expanded: false,
  //   subjects: 'p-reporting',
  //   actions: ['view', 'view (owner)'],
  // },
  // {
  //   id: uuidv4(),
  //   text: 'Logs',
  //   icon: 'ordersbox',
  //   path: '/logs',
  //   selected: false,
  //   expanded: false,
  //   subjects: 'p-logs',
  //   actions: 'view',
  // },
]

export function findNavByPath(navItems: NavItem[], path: string): NavItem | null {
  for (const item of navItems) {
    //* direct match
    if (item.path && path.startsWith(item.path)) return item

    //* search children
    if (item.items?.length) {
      const found = findNavByPath(item.items, path)
      if (found) return found
    }
  }

  return null
}

export function filterNavigationByAbility(items: NavItem[], ability: AnyAbility): NavItem[] {
  return items
    .map((item) => {
      const actions = Array.isArray(item.actions) ? item.actions : [item.actions]
      const subjects = Array.isArray(item.subjects) ? item.subjects : [item.subjects]

      //* check permission for current item
      const canViewItem = actions.some((act) => subjects.some((sub) => ability.can(act, sub)))

      //* filter children recursively
      const filteredChildren = item.items ? filterNavigationByAbility(item.items, ability) : []

      //* show item if user can view it, OR if it has at least 1 visible child
      if (!canViewItem && filteredChildren.length === 0) {
        return null
      }

      return {
        ...item,
        items: filteredChildren.length ? filteredChildren : undefined,
      }
    })
    .filter(Boolean) as NavItem[]
}

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
