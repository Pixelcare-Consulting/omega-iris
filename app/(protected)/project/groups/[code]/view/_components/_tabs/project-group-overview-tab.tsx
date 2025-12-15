'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getPgByCode } from '@/actions/project-group'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Separator from '@/components/separator'

type ProjectGroupOverviewTabProps = {
  projectGroup: NonNullable<Awaited<ReturnType<typeof getPgByCode>>>
}

export default function ProjectGroupOverviewTab({ projectGroup }: ProjectGroupOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Project group overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={projectGroup.code}>
          <Copy value={projectGroup.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Name' value={projectGroup.name} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Status'
          value={projectGroup.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField className='col-span-12' title='Description' value={projectGroup?.description || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Project group record meta data' />

        <RecordMetaData
          createdAt={projectGroup.createdAt}
          updatedAt={projectGroup.updatedAt}
          deletedAt={projectGroup.deletedAt}
          createdBy={projectGroup.createdBy}
          updatedBy={projectGroup.updatedBy}
          deletedBy={projectGroup.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
