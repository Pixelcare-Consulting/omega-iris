'use client'

import ScrollView from 'devextreme-react/scroll-view'
import Button from 'devextreme-react/button'
import { formatBytes } from 'bytes-formatter'

import Copy from '@/components/copy'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import { safeParseInt } from '@/utils'
import { format } from 'date-fns'
import Separator from '@/components/separator'
import { useFileAttachmentsByRefCode } from '@/hooks/safe-actions/file-attachment'
import { useUserById } from '@/hooks/safe-actions/user'

type WorkOrderAttachmentViewProps = {
  data: Record<string, any> & ReturnType<typeof useFileAttachmentsByRefCode>['data'][number]
  onClose: () => void
}

export default function WorkOrderAttachmentView({ data, onClose }: WorkOrderAttachmentViewProps) {
  const uploadedByValue = useUserById(data?.uploadedBy)
  const updatedByValue = useUserById(data?.updatedBy)

  const renderValue = (value: ReturnType<typeof useUserById>) => {
    if (value.isLoading) return ''
    return `${value.data?.fname || ''}${value.data?.lname ? ` ${value.data?.lname}` : ''}`
  }

  return (
    <ScrollView>
      <div className='grid h-full w-full grid-cols-12 gap-5 p-5'>
        <ReadOnlyFieldHeader
          className='col-span-12'
          title='Attachment Overview'
          description='Work order attachment overview information.'
          actions={<Button text='Back' icon='arrowleft' type='default' stylingMode='contained' onClick={onClose} />}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={data?.code || ''}>
          <Copy value={data?.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Name' value={data?.name || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Type' value={data?.type || ''} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Size' value={formatBytes(safeParseInt(data?.size))} />

        <ReadOnlyField className='col-span-12' title='Path' value={data?.path || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Work order record meta data' />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Uploaded At'
          value={format(data.uploadedAt, 'MM-dd-yyyy hh:mm a')}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Updated At'
          value={format(data.updatedAt, 'MM-dd-yyyy hh:mm a')}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Uploaded By'
          value={renderValue(uploadedByValue)}
          isLoading={uploadedByValue.isLoading}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Updated By'
          value={renderValue(updatedByValue)}
          isLoading={updatedByValue.isLoading}
        />
      </div>
    </ScrollView>
  )
}
