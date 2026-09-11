'use client'

import { Column, DataGridRef, Summary, TotalItem, GroupItem } from 'devextreme-react/data-grid'
import { useEffect, useMemo, useRef } from 'react'
import Toolbar from 'devextreme-react/toolbar'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useProjectItemsByWarehouseCode } from '@/hooks/safe-actions/project-item'
import { safeParseFloat } from '@/utils'

type WarehouseProjectAllocationTabProps = {
  projectItems: ReturnType<typeof useProjectItemsByWarehouseCode>
}

//* one row per project per item, the batches behind it are rolled up
type Allocation = {
  key: string
  project: string
  itemCode: string
  description: string
  totalStock: number
}

export default function WarehouseProjectAllocationTab({ projectItems }: WarehouseProjectAllocationTabProps) {
  const DATAGRID_STORAGE_KEY = 'dx-datagrid-warehouse-project-allocation'
  const DATAGRID_UNIQUE_KEY = 'warehouse-project-allocation'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const allocations = useMemo(() => {
    const byKey = new Map<string, Allocation>()

    for (const projectItem of projectItems.data) {
      const itemCode = projectItem.item.ItemCode
      const key = `${projectItem.projectIndividualCode}|${itemCode}`

      const existing = byKey.get(key)

      if (existing) {
        existing.totalStock += safeParseFloat(projectItem.totalStock)
        continue
      }

      byKey.set(key, {
        key,
        project: projectItem.projectIndividual.name,
        itemCode,
        //* the item master name, it stays the same across the batches being rolled up
        description: projectItem.item.ItemName || projectItem.desc || '',
        totalStock: safeParseFloat(projectItem.totalStock),
      })
    }

    return [...byKey.values()]
  }, [projectItems.data])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (projectItems.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [projectItems.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5 px-4'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          exportOptions={{ subjects: 'p-projects-individual-inventory', actions: 'export' }}
        />
      </Toolbar>

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={allocations}
          isLoading={projectItems.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='key'
          dataGridStore={dataGridStore}
        >
          <Column dataField='project' dataType='string' caption='Project' sortOrder='asc' />
          <Column dataField='itemCode' dataType='string' caption='MFG P/N' />
          <Column dataField='description' dataType='string' caption='Description' />
          <Column dataField='totalStock' dataType='number' caption='Total Stock' alignment='left' format={DEFAULT_NUMBER_FORMAT} />

          <Summary>
            <GroupItem column='project' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
            <GroupItem
              column='totalStock'
              summaryType='sum'
              displayFormat='{0}'
              valueFormat={DEFAULT_NUMBER_FORMAT}
              showInGroupFooter={false}
              alignByColumn={true}
            />

            <TotalItem column='totalStock' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
          </Summary>
        </CommonDataGrid>
      </div>
    </div>
  )
}