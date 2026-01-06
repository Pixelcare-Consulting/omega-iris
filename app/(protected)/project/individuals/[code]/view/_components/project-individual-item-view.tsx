'use client'

import { useMemo } from 'react'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { format, isValid } from 'date-fns'

import { getProjecItems } from '@/actions/project-item'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { formatNumber } from 'devextreme/localization'
import { useItemWarehouseInventory } from '@/hooks/safe-actions/item-warehouse-inventory'
import Separator from '@/components/separator'
import { safeParseFloat } from '@/utils'

type ProjectIndividualItemViewProps = {
  data: Awaited<ReturnType<typeof getProjecItems>>[number]
  onClose: () => void
}

export default function ProjectIndividualItemView({ data, onClose }: ProjectIndividualItemViewProps) {
  const item = data.item
  // const warehouse = data.warehouse

  const dateReceived = data.dateReceived && isValid(data?.dateReceived) ? format(data.dateReceived, 'MM/dd/yyyy hh:mm a') : '' // prettier-ignore
  const dateReceivedBy = data.dateReceivedByUser && data.dateReceivedByUser.fname  ? `${data.dateReceivedByUser.fname}${data.dateReceivedByUser.lname ? ` ${data.dateReceivedByUser.lname}` : ''}` : '' // prettier-ignore

  //* Temporary disable
  // const itemMasterWarehouseInventory = useItemWarehouseInventory(item?.code)

  //* Temporary disable
  // const selectedItemMasterWarehouseInventory = useMemo(() => {
  //   if (itemMasterWarehouseInventory.isLoading || itemMasterWarehouseInventory.data.length < 1) return null
  //   return itemMasterWarehouseInventory.data.find((wi) => wi.warehouseCode === warehouse?.code)
  // }, [JSON.stringify(itemMasterWarehouseInventory), warehouse?.code])

  return (
    <ScrollView>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Item Overview'
          description='Inventory item overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField
          className='col-span-12 lg:col-span-3'
          value={
            <img
              src={item.thumbnail || '/images/placeholder-img.jpg'}
              className='size-[280px] w-full rounded-2xl object-cover object-center'
            />
          }
        />

        <div className='col-span-12 grid h-fit grid-cols-12 gap-5 pt-4 md:col-span-12 lg:col-span-9 lg:pt-0'>
          <ReadOnlyField className='col-span-12' title='ID' value={item.code}>
            <Copy value={item.code} />
          </ReadOnlyField>

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer' value={item?.manufacturer || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='MFG P/N' value={item?.manufacturerPartNumber || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={item?.description || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Status' value={item?.isActive ? 'Active' : 'Inactive'} />

          <ReadOnlyField className='col-span-12' title='Notes' value={item?.notes || ''} />
        </div>

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='SAP Fields' description='SAP related fields' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Code' value={item?.ItemCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Manufacturer Code' value={item?.FirmCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Manufacturer Name' value={item.FirmName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Description' value={item.ItemName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Code' value={item?.ItmsGrpCod || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Name' value={item.ItmsGrpNam || ''} />

        {/* <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Price'
          value={formatNumber(item?.Price as any, DEFAULT_CURRENCY_FORMAT)}
        /> */}

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Project Item' description='Project item details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Part Number' value={data?.partNumber || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Code' value={data?.dateCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Country Of Origin' value={data?.countryOfOrigin || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={data?.lotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet No' value={data?.palletNo || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Packaging Type' value={data?.packagingType || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='SPQ' value={data?.spq || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Cost'
          value={formatNumber(safeParseFloat(data?.cost), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available To Order'
          value={formatNumber(safeParseFloat(data?.availableToOrder), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-In (In Process)'
          value={formatNumber(safeParseFloat(data?.stockIn), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-Out (Delivered)'
          value={formatNumber(safeParseFloat(data?.stockOut), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Total Stock'
          value={formatNumber(safeParseFloat(data?.totalStock), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField className='col-span-12' title='Notes' value={data?.notes || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Site Location' value={data?.siteLocation || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 2' value={data?.subLocation2 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 3' value={data?.subLocation3 || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Item Received' description='Item date received and received by details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Received By' value={dateReceivedBy} />

        {/*  //* Temporary disable */}
        {/* <Separator className='col-span-12' />
        <ReadOnlyFieldHeader
          className='col-span-12 mb-1'
          title='Site Location '
          description='Item warehouse and warehouse inventory details'
        />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Warehouse' value={warehouse?.name || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6' title='Description' value={warehouse?.description || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='In Stock'
          value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.inStock), DEFAULT_NUMBER_FORMAT)}
          isLoading={itemMasterWarehouseInventory.isLoading}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Committed'
          value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.committed), DEFAULT_NUMBER_FORMAT)}
          isLoading={itemMasterWarehouseInventory.isLoading}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Ordered'
          value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.ordered), DEFAULT_NUMBER_FORMAT)}
          isLoading={itemMasterWarehouseInventory.isLoading}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available'
          value={formatNumber(safeParseFloat(selectedItemMasterWarehouseInventory?.available), DEFAULT_NUMBER_FORMAT)}
          isLoading={itemMasterWarehouseInventory.isLoading}
        /> */}

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mt-4' title='Record Meta data' description='Project item record meta data' />

        <RecordMetaData
          createdAt={data.createdAt}
          updatedAt={data.updatedAt}
          deletedAt={data.deletedAt}
          createdBy={data.createdBy}
          updatedBy={data.updatedBy}
          deletedBy={data.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
