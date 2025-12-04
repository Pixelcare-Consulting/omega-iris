'use client'

import LoadPanel from 'devextreme-react/load-panel'
import { useRef } from 'react'
import ScrollView from 'devextreme-react/scroll-view'

import { useWoStatusUpdatesByWoCode } from '@/hooks/safe-actions/work-order-status-update'
import { getWoStatusUpdatesByWoCode } from '@/actions/work-order-status-update'
import { WORK_ORDER_STATUS_OPTIONS } from '@/schema/work-order'
import { format } from 'date-fns'
import { useUserById } from '@/hooks/safe-actions/user'

type WorkOrderStatusUpdateTabProps = {
  statusUpdates: ReturnType<typeof useWoStatusUpdatesByWoCode>
}

export default function WorkOrderStatusUpdateTab({ statusUpdates }: WorkOrderStatusUpdateTabProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (statusUpdates.isLoading)
    return (
      <div id='work-order-line-item-view-loading' className='relative mt-4 flex h-[60vh] w-full items-center justify-center'>
        <LoadPanel
          container='#work-order-line-item-view-loading'
          shadingColor='rgb(241, 245, 249)'
          position={{ of: containerRef?.current as any, at: 'center', my: 'center', offset: { x: 110, y: 55 } }}
          message='Loading data...'
          visible
          showIndicator
          showPane
          shading
        />
      </div>
    )

  return (
    <ScrollView>
      <div className='mt-4 flex h-full w-full flex-col gap-3'>
        {statusUpdates.data.length > 0 ? (
          statusUpdates.data.map((update) => <StatusUpdateCard statusUpdate={update} key={update.id} />)
        ) : (
          <div className='flex h-[60vh] w-full items-center justify-center'>
            <div>
              <h1 className='text-center text-lg font-semibold'>No status updates yet!</h1>
              <p className='text-center text-sm text-slate-400'>There are no status updates for this work order.</p>
            </div>
          </div>
        )}
      </div>
    </ScrollView>
  )
}

function StatusUpdateCard({ statusUpdate }: { statusUpdate: Awaited<ReturnType<typeof getWoStatusUpdatesByWoCode>>[number] }) {
  const prevStatus = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === statusUpdate?.prevStatus)?.label
  const currentStatus = WORK_ORDER_STATUS_OPTIONS.find((s) => s.value === statusUpdate?.currentStatus)?.label

  const createdAt = format(statusUpdate.createdAt, 'MMM dd,yyyy hh:mm a')
  const createdBy = useUserById(statusUpdate.createdBy)

  const renderValue = (value: ReturnType<typeof useUserById>) => {
    if (value.isLoading) return '...'
    return `${value.data?.fname || ''}${value.data?.lname ? ` ${value.data?.lname}` : ''}`
  }

  return (
    <div className='flex items-center gap-3 rounded-md border bg-slate-50 p-4'>
      <div className='flex size-10 flex-shrink-0 items-center justify-center rounded-md border bg-white'>
        <i className='dx-icon-rename text-2xl text-primary' />
      </div>

      <div className='flex flex-col gap-1'>
        <h1 className='text-lg'>
          Status Changed from "<span className='font-bold uppercase'>{prevStatus}</span>" to "
          <span className='font-bold uppercase'>{currentStatus}</span>"
        </h1>
        <p className='text-slate-500'>
          Date:{' '}
          <span className='font-semibold'>
            {createdAt} AM By <span>{renderValue(createdBy)}</span>
          </span>
        </p>
        <p className='whitespace-pre-line text-slate-500'>Comment: {statusUpdate?.comments || 'N/A'}</p>
      </div>
    </div>
  )
}
