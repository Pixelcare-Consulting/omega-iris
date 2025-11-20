'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getRolesByCode } from '@/actions/roles'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'

type RoleOverviewTabProps = {
  role: NonNullable<Awaited<ReturnType<typeof getRolesByCode>>>
}

export default function RolesOverviewTab({ role }: RoleOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Role overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={role.code}>
          <Copy value={role.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Name' value={role.name} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Key' value={role.key} />

        <ReadOnlyField className='col-span-12' title='Description' value={role.description} />

        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Role record meta data' />

        <RecordMetaData
          createdAt={role.createdAt}
          updatedAt={role.updatedAt}
          deletedAt={role.deletedAt}
          createdBy={role.createdBy}
          updatedBy={role.updatedBy}
          deletedBy={role.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
