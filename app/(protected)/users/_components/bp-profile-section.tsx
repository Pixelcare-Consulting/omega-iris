'use client'

import { useFormContext, useWatch } from 'react-hook-form'

import SelectBoxField from '@/components/forms/select-box-field'
import { Badge } from '@/components/badge'
import { useSapDatabase } from '@/hooks/use-sap-database'
import { type UserForm } from '@/schema/user'
import { cn } from '@/utils'
import { commonItemRender } from '@/utils/devextreme'
import { BpProfileType, pickBpProfile } from '@/utils/user-bp-profile'
import type { BpProfileCompany } from '@/utils/user-bp-profile-db'

type SavedBpProfile = {
  dbCode: string
  cardType: string
  cardCode: string
  businessPartner: { CardCode: string; CardName: string; GroupName: string | null }
}

type BpProfileSectionProps = {
  className?: string
  profileType: BpProfileType
  title: string
  companies: BpProfileCompany[]
  savedProfiles?: SavedBpProfile[] | null
  isLoading?: boolean
}

//* table with one row per active company, each with a select of that company's cards for this slot
export default function BpProfileSection({ className, profileType, title, companies, savedProfiles, isLoading }: BpProfileSectionProps) {
  const { control } = useFormContext<UserForm>()
  const rows = useWatch({ control, name: 'bpProfiles' }) || []
  const { sapDbCode } = useSapDatabase()

  if (isLoading) return <div className={cn('text-sm', className)}>Loading companies…</div>
  if (companies.length < 1) return <div className={cn('text-sm', className)}>No active companies</div>

  return (
    <div className={cn('overflow-x-auto rounded-md border border-slate-200', className)}>
      <table className='w-full text-sm'>
        <thead className='bg-slate-50 text-left'>
          <tr>
            <th className='w-1/4 border-b border-slate-200 px-3 py-2 font-semibold'>Company</th>
            <th className='w-1/4 border-b border-slate-200 px-3 py-2 font-semibold'>Database</th>
            <th className='border-b border-slate-200 px-3 py-2 font-semibold'>{title}</th>
          </tr>
        </thead>

        <tbody>
          {companies.map((company) => {
            //* the form holds every slot, find this company's row by position
            const index = rows.findIndex((row) => row.dbCode === company.dbCode && row.profileType === profileType)
            if (index < 0) return null

            //* keep the saved card in the list, a synced-only list can leave it out
            const saved = pickBpProfile(savedProfiles, company.dbCode, profileType)?.businessPartner
            const options =
              saved && !company.options.some((option) => option.CardCode === saved.CardCode)
                ? [{ CardCode: saved.CardCode, CardName: saved.CardName, GroupName: saved.GroupName }, ...company.options]
                : company.options

            return (
              <tr key={company.dbCode} className='border-b border-slate-200 last:border-b-0'>
                <td className='px-3 py-2 align-middle'>
                  <div className='flex items-center gap-2'>
                    <span>{company.name}</span>
                    {company.dbCode === sapDbCode && (
                      <Badge variant='soft-green' className='shrink-0'>
                        Active
                      </Badge>
                    )}
                  </div>
                </td>

                <td className='break-all px-3 py-2 align-middle text-slate-500'>{company.dbCode}</td>

                <td className='min-w-64 px-3 py-2 align-middle'>
                  <SelectBoxField
                    data={options}
                    control={control}
                    name={`bpProfiles.${index}.cardCode`}
                    label={`${company.name} ${title}`}
                    isHideLabel
                    placeholder={`Select ${title.toLowerCase()}…`}
                    valueExpr='CardCode'
                    displayExpr={(item) => (item ? `${item?.CardName} (${item?.CardCode})` : '')}
                    searchExpr={['CardName', 'CardCode', 'GroupName']}
                    extendedProps={{
                      selectBoxOptions: {
                        itemRender: (params) => {
                          return commonItemRender({ title: params?.CardName, description: params?.GroupName, value: params?.CardCode })
                        },
                      },
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
