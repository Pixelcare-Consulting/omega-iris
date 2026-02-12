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

export const WORK_ORDER_STATUS_VALUE_MAP = {
  Open: 1,
  Pending: 2,
  'In Process': 3,
  Verified: 4,
  'Partial Delivery': 5,
  Delivered: 6,
  Cancelled: 7,
  Deleted: 8,
} as const

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

export const workOrderItemFormSchema = z
  .object({
    projectItemCode: z.coerce.number().min(1, { message: 'Item is required' }),
    qty: z.coerce.number().refine((val) => val > 0, { message: 'Quantity is required' }),
    maxQty: z.coerce.number(),
    isDelivered: z.boolean(),
  })
  .refine(
    (formData) => {
      if (formData.projectItemCode === 0) return true
      if (formData.maxQty === 0) return true
      return formData.qty <= formData.maxQty
    },
    {
      path: ['qty'],
      message: 'Quantity cannot be greater than the available to order',
    }
  )

export const workOrderLineItemsFormSchema = z.object({
  lineItems: z.array(workOrderItemFormSchema).min(1, { message: 'Please select & set at least one item' }),
})

export const upsertWorkOrderLineItemFormSchema = workOrderItemFormSchema._def.schema
  .merge(z.object({ operation: z.enum(['create', 'update']), workOrderCode: z.coerce.number() }))
  .refine(
    (formData) => {
      if (formData.projectItemCode === 0) return true
      if (formData.maxQty === 0) return true
      return formData.qty <= formData.maxQty
    },
    {
      path: ['qty'],
      message: 'Quantity cannot be greater than the available to order',
    }
  )

export const upsertWorkOrderLineItemsFormSchema = z.object({
  workOrderCode: z.coerce.number(),
  lineItems: z.array(
    workOrderItemFormSchema._def.schema.refine(
      (formData) => {
        if (formData.projectItemCode === 0) return true
        if (formData.maxQty === 0) return true
        return formData.qty <= formData.maxQty
      },
      {
        path: ['qty'],
        message: 'Quantity cannot be greater than the available to order',
      }
    )
  ),
})

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
  alternativeAddr: z.string().nullish(),
  comments: z.string().nullish(),

  //* work order items
  lineItems: z.array(workOrderItemFormSchema).min(1, { message: 'Please select & set at least one item' }),

  //* sap fields
  salesOrderCode: z.coerce.number().nullish(),
  purchaseOrderCode: z.coerce.number().nullish(),
})

export const workOrderStatusUpdateFormSchema = z.object({
  workOrders: z.array(
    z.object({
      code: z.coerce.number().min(1, { message: 'Work order code is required' }),
      prevStatus: z.string().min(1, { message: 'Previous status is required' }),
      deliveredProjectItems: z.array(z.coerce.number()).default([]),
    })
  ),
  currentStatus: z.string().min(1, { message: 'Status is required' }),
  comments: z.string().nullish(),
  trackingNum: z.string().nullish(),
})

export type WorkOrderItemForm = z.infer<typeof workOrderItemFormSchema>
export type WorkOrderLineItemsForm = z.infer<typeof workOrderLineItemsFormSchema>
export type UpsertWorkOrderLineItemForm = z.infer<typeof upsertWorkOrderLineItemFormSchema>
export type WorkOrderForm = z.infer<typeof workOrderFormSchema>
export type WorkOrderStatusUpdateForm = z.infer<typeof workOrderStatusUpdateFormSchema>
