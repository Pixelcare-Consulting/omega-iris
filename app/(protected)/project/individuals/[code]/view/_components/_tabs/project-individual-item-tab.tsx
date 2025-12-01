import ProjectIndividualItemTable from '../project-individual-item-table'
import { useProjecItemsClient } from '@/hooks/safe-actions/project-item'
import { useWarehouseClient } from '@/hooks/safe-actions/warehouse'

export type ProjectIndividualItemProps = {
  projectCode: number
  projectName: string
  items: ReturnType<typeof useProjecItemsClient>
  warehouses: ReturnType<typeof useWarehouseClient>
}

export default function ProjectIndividualCustomerTab(props: ProjectIndividualItemProps) {
  return (
    <div className='flex h-full w-full flex-col'>
      <ProjectIndividualItemTable {...props} />
    </div>
  )
}
