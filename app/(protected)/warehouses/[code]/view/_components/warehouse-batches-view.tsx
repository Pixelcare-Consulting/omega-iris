'use client'

import { useMemo } from 'react'
import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { format } from 'date-fns'

import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { formatNumber } from 'devextreme/localization'
import Separator from '@/components/separator'
import { safeParseFloat, safeParseInt } from '@/utils'
import { useSession } from 'next-auth/react'
import { getBatchesMasterByWarehouseCode } from '@/actions/batches'
import { parseSapCompactDate } from '@/utils/sap'

type ProjectIndividualItemViewProps = {
  data: Awaited<ReturnType<typeof getBatchesMasterByWarehouseCode>>[number]
  onClose: () => void
}

export default function WarehouseBatchView({ data, onClose }: ProjectIndividualItemViewProps) {
  const { data: session } = useSession()

  const parseDateRecieved = parseSapCompactDate(data?.InDate)
  const parseCreateDate = parseSapCompactDate(data?.CreateDate)
  const parseUpdateDate = parseSapCompactDate(data?.UpdateDate)

  const dateReceived = parseDateRecieved ? format(parseDateRecieved, 'MM-dd-yyyy') : '' // prettier-ignore
  const createDate = parseCreateDate ? format(parseCreateDate, 'MM-dd-yyyy') : '' // prettier-ignore
  const updateDate = parseUpdateDate ? format(parseUpdateDate, 'MM-dd-yyyy') : '' // prettier-ignore

  const available = safeParseInt(data?.OnHand) - safeParseInt(data?.IsCommited) + safeParseInt(data?.OnOrder)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  return (
    <ScrollView useNative>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Batch Overview'
          description='Batch overview information'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Batch #' value={data.DistNumber}>
          <Copy value={data.DistNumber} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Project ID' value={data.U_ProjectID}>
          <Copy value={data.U_ProjectID} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Owner' value={data?.U_Owner || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group' value={data?.U_Group || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Division' value={data?.U_Division || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Site' value={data?.U_Site || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='CM Site' value={data?.U_CMSite || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Phase' value={data?.U_Phase || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='MFG P/N' value={data?.ItemCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Part Number' value={data?.U_PartNumber || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Manufacturer Code' value={data?.FirmCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Manufacturer Name' value={data?.FirmName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Description' value={data?.ItemName || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Commodities' value={data?.U_Commodities || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='DC' value={data?.U_DateCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='COO' value={data?.MnfSerial || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Lot Code' value={data?.U_LotCode || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Packaging Type' value={data?.U_PackagingType || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='SPQ' value={data?.U_SPQ || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Total Stock'
          value={formatNumber(safeParseFloat(data?.Quantity), DEFAULT_NUMBER_FORMAT)}
          isHide={isBusinessPartner}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Notes' value={data?.Notes || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Warehouse' description='Batch warehouse details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Warehouse' value={data?.WhsCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='On Hand'
          value={formatNumber(data?.OnHand, DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Committed'
          value={formatNumber(data?.IsCommited, DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Ordered'
          value={formatNumber(data?.OnOrder, DEFAULT_NUMBER_FORMAT)}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Available'
          value={formatNumber(available, DEFAULT_NUMBER_FORMAT)}
        />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mb-1' title='Bin Location' description='Batch bin location details' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Bin Location' value={data?.BinCode || ''} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='On Hand'
          value={formatNumber(data?.BinOnHandQty, DEFAULT_NUMBER_FORMAT)}
        />

        {!isBusinessPartner && (
          <>
            <Separator className='col-span-12' />
            <ReadOnlyFieldHeader
              className='col-span-12 mb-1'
              title='Item Received'
              description='Item date received and received by details'
            />

            <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Date Received' value={dateReceived} />
          </>
        )}

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12 mt-4' title='Record Meta data' description='Batch record meta data' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Created At' value={createDate} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Updated At' value={updateDate} />
      </div>
    </ScrollView>
  )
}
