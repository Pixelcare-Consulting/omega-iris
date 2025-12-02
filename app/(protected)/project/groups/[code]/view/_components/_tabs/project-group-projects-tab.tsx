import { getPisByGroupCode } from '@/actions/project-individual'
import ProjectGroupProjectTable from '../project-groups-project-table'

export type ProjectGroupProjectsTabProps = {
  groupCode: number
  projects: { data: NonNullable<Awaited<ReturnType<typeof getPisByGroupCode>>>; isLoading?: boolean }
}

export default function ProjectGroupProjectsTab(props: ProjectGroupProjectsTabProps) {
  return (
    <div className='flex h-full w-full flex-col'>
      <ProjectGroupProjectTable {...props} />
    </div>
  )
}
