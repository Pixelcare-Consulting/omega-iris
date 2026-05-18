'use client'

import ScrollView from 'devextreme-react/scroll-view'

import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'

import Separator from '@/components/separator'
import { getAllProjectItemByCode } from '@/actions/project-item'
import { format, isValid } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { formatNumber } from 'devextreme/localization'
import { safeParseFloat } from '@/utils'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'

type ProjectInventoryOverviewTabProps = {
  projectItem: NonNullable<Awaited<ReturnType<typeof getAllProjectItemByCode>>>
}

export default function ProjectInventoryOverviewTab({ projectItem }: ProjectInventoryOverviewTabProps) {
  const { data: session } = useSession()

  const item = projectItem.item

  const dateReceived = projectItem.dateReceived && isValid(projectItem?.dateReceived) ? format(projectItem.dateReceived, 'MM/dd/yyyy hh:mm a') : '' // prettier-ignore
  const dateReceivedBy = projectItem.dateReceivedByUser && projectItem.dateReceivedByUser.fname  ? `${projectItem.dateReceivedByUser.fname}${projectItem.dateReceivedByUser.lname ? ` ${projectItem.dateReceivedByUser.lname}` : ''}` : '' // prettier-ignore

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  return (
    <ScrollView useNative>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Item Master Overview'
          description='Project inventory item overview information'
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

          <ReadOnlyField className='col-span-12 md:col-span-6' title='MFG P/N' value={item?.ItemCode || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Description ' value={item?.ItemName || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer Code' value={item?.FirmCode || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer Name' value={item?.FirmName || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Group Code' value={item?.ItmsGrpCod || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Group Name' value={item.ItmsGrpNam || ''} />

          <ReadOnlyField className='col-span-12' title='Notes' value={item?.notes || ''} />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Status' value={item?.isActive ? 'Active' : 'Inactive'} />
        </div>

        {/* <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Price'
          value={formatNumber(item?.Price as any, DEFAULT_CURRENCY_FORMAT)}
        /> */}

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Project Item' description='Project item details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={projectItem.code}>
          <Copy value={projectItem.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Owner' value={projectItem?.owner || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Part Number' value={projectItem?.partNumber || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Code' value={projectItem?.dateCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Country Of Origin'
          value={projectItem?.countryOfOrigin || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={projectItem?.lotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Pallet No' value={projectItem?.palletNo || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Packaging Type'
          value={projectItem?.packagingType || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='SPQ' value={projectItem?.spq || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Cost'
          value={formatNumber(safeParseFloat(projectItem?.cost), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available To Order'
          value={formatNumber(safeParseFloat(projectItem?.availableToOrder), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-In (In Process)'
          value={formatNumber(safeParseFloat(projectItem?.stockIn), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-Out (Delivered)'
          value={formatNumber(safeParseFloat(projectItem?.stockOut), DEFAULT_NUMBER_FORMAT)}
        />

        {!isBusinessPartner && (
          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='Total Stock'
            value={formatNumber(safeParseFloat(projectItem?.totalStock), DEFAULT_NUMBER_FORMAT)}
          />
        )}

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='MFR'
          value={projectItem?.mfr || ''}
          description='Temporary manufacturer field'
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Description'
          value={projectItem?.desc || ''}
          description='Temporary description field'
        />

        <ReadOnlyField className='col-span-12' title='Notes' value={projectItem?.notes || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Site Location' value={projectItem?.siteLocation || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 2' value={projectItem?.subLocation2 || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Sub Location 3' value={projectItem?.subLocation3 || ''} />

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader
              className='col-span-12 mb-1'
              title='Item Received'
              description='Item date received and received by details'
            />

            <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />

            <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Received By' value={dateReceivedBy} />
          </>
        )}

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

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader
              className='col-span-12 mt-4'
              title='Record Meta projectItem'
              description='Project item record meta projectItem'
            />

            <RecordMetaData
              createdAt={projectItem.createdAt}
              updatedAt={projectItem.updatedAt}
              deletedAt={projectItem.deletedAt}
              createdBy={projectItem.createdBy}
              updatedBy={projectItem.updatedBy}
              deletedBy={projectItem.deletedBy}
            />
          </>
        )}
      </div>
    </ScrollView>
  )
}
