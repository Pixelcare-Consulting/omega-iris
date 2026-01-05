import { z } from 'zod'

export const WORK_ORDER_STATUS = [
  'Open',
  'Pending',
  'In Process',
  'Verified',
  'Partial Delivery',
  'Delivered',
  'Cancelled',
  'Deleted',
] as const

export const WORK_ORDER_STATUS_OPTIONS: { label: (typeof WORK_ORDER_STATUS)[number]; value: string }[] = [
  { label: 'Open', value: '1' },
  { label: 'Pending', value: '2' },
  { label: 'In Process', value: '3' },
  { label: 'Verified', value: '4' },
  { label: 'Partial Delivery', value: '5' },
  { label: 'Delivered', value: '6' },
  { label: 'Cancelled', value: '7' },
  { label: 'Deleted', value: '8' },
]

export const workOrderItemFormSchema = z.object({
  projectItemCode: z.coerce.number().min(1, { message: 'Item is required' }),
  qty: z.coerce.number().refine((val) => val > 0, { message: 'Quantity is required' }),
})

export const upsertWorkOrderLineItemFormSchema = workOrderItemFormSchema.merge(
  z.object({ operation: z.enum(['create', 'update']), workOrderCode: z.coerce.number() })
)

export const deleteWorkOrderLineItemFormSchema = z.object({
  workOrderCode: z.coerce.number(),
  projectItemCode: z.coerce.number(),
})

export const workOrderFormSchema = z.object({
  code: z.coerce.number(),
  projectIndividualCode: z.coerce.number().min(1, { message: 'Project is required' }),
  userCode: z.coerce.number().min(1, { message: 'Owner is required' }),
  status: z.string().min(1, { message: 'Status is required' }),
  isInternal: z.boolean(),
  billingAddrCode: z.string().nullish(),
  shippingAddrCode: z.string().nullish(),
  comments: z.string().nullish(),

  //* work order items
  lineItems: z.array(workOrderItemFormSchema).min(1, { message: 'At least one line item is required' }),

  //* sap fields
  salesOrderCode: z.coerce.number().nullish(),
  purchaseOrderCode: z.coerce.number().nullish(),
})

export const workOrderStatusUpdateFormSchema = z.object({
  workOrders: z.array(
    z.object({
      code: z.coerce.number().min(1, { message: 'Work order code is required' }),
      prevStatus: z.string().min(1, { message: 'Previous status is required' }),
    })
  ),
  currentStatus: z.string().min(1, { message: 'Status is required' }),
  comments: z.string().nullish(),
})

export type WorkOrderItemForm = z.infer<typeof workOrderItemFormSchema>
export type UpsertWorkOrderLineItemForm = z.infer<typeof upsertWorkOrderLineItemFormSchema>
export type WorkOrderForm = z.infer<typeof workOrderFormSchema>
export type WorkOrderStatusUpdateForm = z.infer<typeof workOrderStatusUpdateFormSchema>
