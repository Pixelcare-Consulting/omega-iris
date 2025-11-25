'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getProjectIndividualByCode } from '@/actions/project-individual'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'

type ProjectIndividualOverviewTabProps = {
  projectIndividual: NonNullable<Awaited<ReturnType<typeof getProjectIndividualByCode>>>
}

export default function ProjectIndividualOverviewTab({ projectIndividual }: ProjectIndividualOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Project group overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={projectIndividual.code}>
          <Copy value={projectIndividual.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Name' value={projectIndividual.name} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group ID' value={projectIndividual.projectGroup.code}>
          <Copy value={projectIndividual.projectGroup.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Group Name' value={projectIndividual.projectGroup.name} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={projectIndividual.isActive ? 'Active' : 'Inactive'}
        />

        <ReadOnlyField className='col-span-12' title='Description' value={projectIndividual?.description || ''} />

        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Project group record meta data' />

        <RecordMetaData
          createdAt={projectIndividual.createdAt}
          updatedAt={projectIndividual.updatedAt}
          deletedAt={projectIndividual.deletedAt}
          createdBy={projectIndividual.createdBy}
          updatedBy={projectIndividual.updatedBy}
          deletedBy={projectIndividual.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
