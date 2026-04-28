'use client'

import ScrollView from 'devextreme-react/scroll-view'

import { getReportByCode } from '@/actions/report'
import ReadOnlyField from '@/components/read-only-field'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import Copy from '@/components/copy'
import RecordMetaData from '@/app/(protected)/_components/record-meta-data'
import Separator from '@/components/separator'
import { REPORT_TYPE_LABEL } from '@/schema/report'

type ReportOverviewTabProps = {
  report: NonNullable<Awaited<ReturnType<typeof getReportByCode>>>
}

export default function ReportOverviewTab({ report }: ReportOverviewTabProps) {
  return (
    <ScrollView>
      <div className='grid grid-cols-12 gap-5 p-3 py-5'>
        <ReadOnlyFieldHeader className='col-span-12' title='Overview' description='Report overview information' />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='ID' value={report.code}>
          <Copy value={report.code} />
        </ReadOnlyField>

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Title' value={report.title} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='File Name' value={report.fileName} />

        <ReadOnlyField
          className='col-span-12 md:col-span-6 lg:col-span-4'
          title='Type'
          value={REPORT_TYPE_LABEL?.[report.type as '1' | '2'] || ''}
        />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Status' value={report.isActive ? 'Active' : 'Inactive'} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Feautured' value={report.isFeatured ? 'Yes' : 'No'} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Default' value={report.isDefault ? 'Yes' : 'No'} />

        <ReadOnlyField className='col-span-12 md:col-span-6 lg:col-span-4' title='Internal' value={report.isInternal ? 'Yes' : 'No'} />

        <ReadOnlyField className='col-span-12' title='Description' value={report?.description || ''} />

        <Separator className='col-span-12' />
        <ReadOnlyFieldHeader className='col-span-12' title='Record Meta data' description='Report record meta data' />

        <RecordMetaData
          createdAt={report.createdAt}
          updatedAt={report.updatedAt}
          deletedAt={report.deletedAt}
          createdBy={report.createdBy}
          updatedBy={report.updatedBy}
          deletedBy={report.deletedBy}
        />
      </div>
    </ScrollView>
  )
}
