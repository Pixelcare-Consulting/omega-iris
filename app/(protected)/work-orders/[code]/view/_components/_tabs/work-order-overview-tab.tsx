'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getWorkOrderByCode } from '@/actions/work-order'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import { formatNumber } from 'devextreme/localization'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import { WORK_ORDER_STATUS_OPTIONS } from '@/schema/work-order'
import Separator from '@/components/separator'
import { useSalesOrderByWorkOrderCode } from '@/hooks/safe-actions/sales-order'
import { useAddressById } from '@/hooks/safe-actions/address'

type WorkOrderOverviewTabProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  salesOrder: ReturnType<typeof useSalesOrderByWorkOrderCode>
  billingAddress: ReturnType<typeof useAddressById>
  shippingAddress: ReturnType<typeof useAddressById>
}

export default function WorkOrderOverviewTab({ workOrder, salesOrder, billingAddress, shippingAddress }: WorkOrderOverviewTabProps) {
  const fullName = workOrder.user ? `${workOrder?.user?.fname}${workOrder?.user?.lname ? ` ${workOrder?.user?.lname}` : ''}` : ''
  const status = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === workOrder.status)?.label

  const getAddressValue = (address: ReturnType<typeof useAddressById>['data']) => {
    if (!address) return ''

    const description = [
      address?.Street,
      address?.Address2,
      address?.Address3,
      address?.StreetNo,
      address?.BuildingFloorRoom,
      address?.Block,
      address?.City,
      address?.ZipCode,
      address?.County,
      address?.CountryName,
      address?.StateName,
      address?.GlobalLocationNumber,
    ]
      .filter(Boolean)
      .join(', ')

    return {
      label: address.AddressName,
      value: address.id,
      description,
      address,
    }
  }

  const billingAddressValue = getAddressValue(billingAddress.data)
  const shippingAddressValue = getAddressValue(shippingAddress.data)

  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Work order overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={workOrder.code}>
          <Copy value={workOrder.code} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Project ID'
          value={workOrder?.projectIndividualCode || ''}
        >
          <Copy value={workOrder?.projectIndividualCode || ''} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Project Name'
          value={workOrder.projectIndividual?.name || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Project Group ID'
          value={workOrder?.projectIndividual?.projectGroup?.code || ''}
        >
          <Copy value={workOrder?.projectIndividual?.projectGroup?.code || ''} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Project Group Name'
          value={workOrder.projectIndividual?.projectGroup?.name || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Status' value={status || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Internal' value={workOrder.isInternal ? 'Yes' : 'No'} />

        <ReadOnlyField className='col-span-12' title='Order Comments'>
          <p className='whitespace-pre-line'>{workOrder.comments || ''}</p>
        </ReadOnlyField>

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='SAP Fields' description='SAP related fields' />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Sales Order Code'
          value={salesOrder?.data?.DocNum || ''}
          isLoading={salesOrder.isLoading}
        >
          {salesOrder?.data?.DocNum && <Copy value={salesOrder?.data?.DocNum || ''} />}
        </ReadOnlyField>

        <ReadOnlyFieldHeader className='col-span-12' title='Owner' description='Work order owner details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Owner ID' value={workOrder?.userCode || ''}>
          <Copy value={workOrder?.userCode || ''} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Customer Code'
          value={workOrder?.user?.customerCode || ''}
        >
          <Copy value={workOrder?.user?.customerCode || ''} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Owner Name' value={fullName} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Owner Email' value={workOrder?.user?.email || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Address Details'
          description='Billing & delivery address details'
          actions={
            <ReadOnlyField
              className='flex items-center gap-1'
              title='Use Alternative Address'
              value={workOrder.isAlternativeAddr ? 'Yes' : 'No'}
            />
          }
        />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Billing Address' isLoading={billingAddress.isLoading}>
          {billingAddressValue && (
            <div className='flex flex-col gap-2'>
              <div>{billingAddressValue.label}</div>
              <div>{billingAddressValue.description}</div>
            </div>
          )}
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Delivery Address'>
          {shippingAddressValue && (
            <div className='flex flex-col gap-2'>
              <div>{shippingAddressValue.label}</div>
              <div>{shippingAddressValue.description}</div>
            </div>
          )}
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Alternative Billing Address'>
          <p className='whitespace-pre-line'>{workOrder.alternativeBillingAddr || ''}</p>
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Alternative Delivery Address'>
          <p className='whitespace-pre-line'>{workOrder.alternativeShippingAddr || ''}</p>
        </ReadOnlyField>

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Work order record meta data' />

        <RecordMetaData
          createdAt={workOrder.createdAt}
          updatedAt={workOrder.updatedAt}
          deletedAt={workOrder.deletedAt}
          createdBy={workOrder.createdBy}
          updatedBy={workOrder.updatedBy}
          deletedBy={workOrder.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
