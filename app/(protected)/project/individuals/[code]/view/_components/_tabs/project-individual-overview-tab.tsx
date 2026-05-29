'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

import { getPiByCode } from '@/actions/project-individual'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Separator from '@/components/separator'

type ProjectIndividualOverviewTabProps = {
  projectIndividual: NonNullable<Awaited<ReturnType<typeof getPiByCode>>>
}

export default function ProjectIndividualOverviewTab({ projectIndividual }: ProjectIndividualOverviewTabProps) {
  const { data: session } = useSession()

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const salesCloser = projectIndividual?.userSalesCloser

  return (
    <ScrollView useNative>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Project group overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='ID' value={projectIndividual.code}>
          <Copy value={projectIndividual.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-3' title='Name' value={projectIndividual.name} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Group ID'
          value={projectIndividual?.projectGroup?.code || ''}
        >
          <Copy value={projectIndividual?.projectGroup?.code || ''} />
        </ReadOnlyField>

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Group Name'
          value={projectIndividual?.projectGroup?.name || ''}
        />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-3'
          title='Status'
          value={projectIndividual.isActive ? 'Active' : 'Inactive'}
        />

        {!isBusinessPartner && (
          <ReadOnlyField
            className='col-span-12 md:col-span-6 lg:col-span-3'
            title='Sales Closer'
            value={[salesCloser?.fname, salesCloser?.lname].filter(Boolean).join(' ')}
          />
        )}

        <ReadOnlyField className='col-span-12' title='Description' value={projectIndividual?.description || ''} />

        <Separator className='col-span-12' />
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
