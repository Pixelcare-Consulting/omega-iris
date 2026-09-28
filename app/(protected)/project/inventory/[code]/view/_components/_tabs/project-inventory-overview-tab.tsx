'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { differenceInDays, format, isValid } from 'date-fns'
import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { formatNumber } from 'devextreme/localization'

import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import Separator from '@/components/separator'
import { getAllProjectItemByCode } from '@/actions/project-item'
import { safeParseFloat } from '@/utils'
import { DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import ProjectIndividualItemSapInventory from '@/app/(protected)/project/individuals/[code]/view/_components/project-individual-item-sap-inventory'
import { useCustomTfsProcess } from '@/hooks/use-custom-tfs-process'
import { BUSINESS_PARTNER_ROLE_KEY } from '@/constants/role'
import { TFS_ONLY_FIELDS } from '@/constants/project-item'
import { MODULE_NAME } from '@/constants/module'
import { useCurrentUserHiddenFields } from '@/hooks/safe-actions/user-hidden-field'

type ProjectInventoryOverviewTabProps = {
  projectItem: NonNullable<Awaited<ReturnType<typeof getAllProjectItemByCode>>>
}

export default function ProjectInventoryOverviewTab({ projectItem }: ProjectInventoryOverviewTabProps) {
  const { data: session } = useSession()
  const { isEnabled: isCustomTfsEnabled } = useCustomTfsProcess()

  const item = projectItem.item

  const dateReceived = projectItem.dateReceived && isValid(projectItem?.dateReceived) ? format(projectItem.dateReceived, 'MM/dd/yyyy hh:mm a') : '' // prettier-ignore
  const dateReceivedBy = projectItem.dateReceivedByUser && projectItem.dateReceivedByUser.fname  ? `${projectItem.dateReceivedByUser.fname}${projectItem.dateReceivedByUser.lname ? ` ${projectItem.dateReceivedByUser.lname}` : ''}` : '' // prettier-ignore

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === BUSINESS_PARTNER_ROLE_KEY
  }, [JSON.stringify(session)])

  const userHiddenFields = useCurrentUserHiddenFields(MODULE_NAME.PROJECT_ITEMS)

  const hiddenFields = useMemo(() => {
    //* warehouse, bin and batch have no meaning outside the custom tfs process
    const tfsFields = isCustomTfsEnabled ? [] : TFS_ONLY_FIELDS
    return [...userHiddenFields.data, ...tfsFields]
  }, [isCustomTfsEnabled, JSON.stringify(userHiddenFields.data)])

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
          isHide={hiddenFields.includes('item.thumbnail')}
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

          <ReadOnlyField
            className='col-span-12 md:col-span-6'
            title='MFG P/N'
            isHide={hiddenFields.includes('item.ItemCode')}
            value={item?.ItemCode || ''}
          />

          <ReadOnlyField
            className='col-span-12 md:col-span-6'
            title='Description '
            isHide={hiddenFields.includes('item.ItemName')}
            value={item?.ItemName || ''}
          />

          <ReadOnlyField className='col-span-12 md:col-span-6' title='Manufacturer Code' value={item?.FirmCode || ''} />

          <ReadOnlyField
            className='col-span-12 md:col-span-6'
            title='Manufacturer Name'
            isHide={hiddenFields.includes('item.FirmName')}
            value={item?.FirmName || ''}
          />

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

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Owner'
          isHide={hiddenFields.includes('owner')}
          value={projectItem?.owner || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Part Number'
          isHide={hiddenFields.includes('partNumber')}
          value={projectItem?.partNumber || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='DC'
          isHide={hiddenFields.includes('dateCode')}
          value={projectItem?.dateCode || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='COO'
          isHide={hiddenFields.includes('countryOfOrigin')}
          value={projectItem?.countryOfOrigin || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Lot Code'
          isHide={hiddenFields.includes('lotCode')}
          value={projectItem?.lotCode || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Pallet No'
          isHide={hiddenFields.includes('palletNo')}
          value={projectItem?.palletNo || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Packaging Type'
          isHide={hiddenFields.includes('packagingType')}
          value={projectItem?.packagingType || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='SPQ'
          isHide={hiddenFields.includes('spq')}
          value={projectItem?.spq || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Cost'
          isHide={hiddenFields.includes('cost')}
          value={formatNumber(safeParseFloat(projectItem?.cost), DEFAULT_CURRENCY_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available To Order'
          isHide={hiddenFields.includes('availableToOrder')}
          value={formatNumber(safeParseFloat(projectItem?.availableToOrder), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-In (In Process)'
          isHide={hiddenFields.includes('stockIn')}
          value={formatNumber(safeParseFloat(projectItem?.stockIn), DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Stock-Out (Delivered)'
          isHide={hiddenFields.includes('stockOut')}
          value={formatNumber(safeParseFloat(projectItem?.stockOut), DEFAULT_NUMBER_FORMAT)}
        />

        {!isBusinessPartner && (
          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='Total Stock'
            isHide={hiddenFields.includes('totalStock')}
            value={formatNumber(safeParseFloat(projectItem?.totalStock), DEFAULT_NUMBER_FORMAT)}
          />
        )}

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='MFR'
          isHide={hiddenFields.includes('mfr')}
          value={projectItem?.mfr || ''}
          description='Temporary manufacturer field'
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Desc'
          isHide={hiddenFields.includes('desc')}
          value={projectItem?.desc || ''}
          description='Temporary description field'
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Commodities'
          isHide={hiddenFields.includes('commodities')}
          value={projectItem?.commodities || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Aging Days'
          isHide={hiddenFields.includes('agingDays')}
          value={formatNumber(projectItem?.createdAt ? differenceInDays(new Date(), projectItem?.createdAt) : 0, DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField className='col-span-12' title='Notes' isHide={hiddenFields.includes('notes')} value={projectItem?.notes || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Location' description='Item location details' />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Warehouse'
          value={projectItem?.warehouse ? `${projectItem.warehouse.WarehouseName} (${projectItem.warehouse.WarehouseCode})` : ''}
          isHide={hiddenFields.includes('warehouseCode')}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Bin Location'
          value={projectItem?.binCode || ''}
          isHide={hiddenFields.includes('binCode')}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Batch #'
          value={projectItem?.DistNumber || ''}
          isHide={hiddenFields.includes('DistNumber')}
        >
          {projectItem?.DistNumber ? <Copy value={projectItem.DistNumber} /> : null}
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Site Location'
          isHide={hiddenFields.includes('siteLocation')}
          value={projectItem?.siteLocation || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Sub Location 2'
          isHide={hiddenFields.includes('subLocation2')}
          value={projectItem?.subLocation2 || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Sub Location 3'
          isHide={hiddenFields.includes('subLocation3')}
          value={projectItem?.subLocation3 || ''}
        />

        <Separator className='col-span-12' />

        {/* //* nothing to show without a warehouse, so the panel goes with it */}
        {isCustomTfsEnabled && (
          <ProjectIndividualItemSapInventory
            warehouseCode={projectItem?.warehouseCode}
            itemCode={item?.ItemCode}
            emptyText='No warehouse is set for this item, so there is no SAP stock to show.'
          />
        )}

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader
              className='col-span-12 mb-1'
              title='Item Received'
              description='Item date received and received by details'
            />

            <ReadOnlyField
              className='col-span-12 md:col-span-6 lg:col-span-3'
              title='Date Received'
              isHide={hiddenFields.includes('dateReceived')}
              value={dateReceived}
            />

            <ReadOnlyField
              className='col-span-12 md:col-span-6 lg:col-span-3'
              title='Received By'
              isHide={hiddenFields.includes('dateReceivedBy')}
              value={dateReceivedBy}
            />
          </>
        )}

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader
              className='col-span-12 mt-4'
              title='Record Meta project Item'
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
