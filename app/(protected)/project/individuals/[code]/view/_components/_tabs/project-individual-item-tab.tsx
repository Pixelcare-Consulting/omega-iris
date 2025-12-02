import ProjectIndividualItemTable from '../project-individual-item-table'
import { useProjecItems } from '@/hooks/safe-actions/project-item'
import { useWarehouse } from '@/hooks/safe-actions/warehouse'

export type ProjectIndividualItemProps = {
  projectCode: number
  projectName: string
  items: ReturnType<typeof useProjecItems>
  warehouses: ReturnType<typeof useWarehouse>
}

export default function ProjectIndividualCustomerTab(props: ProjectIndividualItemProps) {
  return (
    <div className='flex h-full w-full flex-col'>
      <ProjectIndividualItemTable {...props} />
    </div>
  )
}
