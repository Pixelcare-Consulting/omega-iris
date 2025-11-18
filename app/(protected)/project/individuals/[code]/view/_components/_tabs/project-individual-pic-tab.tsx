import { getNonCustomerUsers } from '@/actions/users'
import ProjectIndividualPicTable from '../project-individual-pic-table'

export type ProjectIndividualPicsTabProps = {
  projectCode: number
  pics: number[]
  users: { data: Awaited<ReturnType<typeof getNonCustomerUsers>>; isLoading?: boolean }
}

export default function ProjectIndividualPicTab(props: ProjectIndividualPicsTabProps) {
  return (
    <div className='flex h-full w-full flex-col'>
      <ProjectIndividualPicTable {...props} />
    </div>
  )
}
