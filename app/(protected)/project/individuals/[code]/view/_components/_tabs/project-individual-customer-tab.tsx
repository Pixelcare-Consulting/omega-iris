import { getUsersByRoleKey } from '@/actions/users'
import ProjectIndividualCustomerTable from '../project-individual-customer-table'

export type ProjectIndividualCustomerTabProps = {
  projectCode: number
  customers: number[]
  users: { data: Awaited<ReturnType<typeof getUsersByRoleKey>>; isLoading?: boolean }
}

export default function ProjectIndividualCustomerTab(props: ProjectIndividualCustomerTabProps) {
  return (
    <div className='flex h-full w-full flex-col'>
      <ProjectIndividualCustomerTable {...props} />
    </div>
  )
}
