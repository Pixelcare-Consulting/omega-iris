//* one name per module, shared by file attachments and user hidden fields
export const MODULE_NAME = {
  WORK_ORDERS: 'work-orders',
  PROJECT_ITEMS: 'project-items',
} as const

export type ModuleName = (typeof MODULE_NAME)[keyof typeof MODULE_NAME]