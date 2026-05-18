'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton, Summary, TotalItem, GroupItem } from 'devextreme-react/data-grid'
import { useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { getAllProjectItems, getProjecItems } from '@/actions/project-item'
import { COMMON_DATAGRID_STORE_KEYS, DEFAULT_CURRENCY_FORMAT, DEFAULT_NUMBER_FORMAT } from '@/constants/devextreme'
import { useSession } from 'next-auth/react'
import { hideActionButton } from '@/utils/devextreme'
import CanView from '@/components/acl/can-view'
import PageHeader from '@/app/(protected)/_components/page-header'

type ProjectInventoryTableProps = {
  allProjectItems: Awaited<ReturnType<typeof getAllProjectItems>>
}
type DataSource = Awaited<ReturnType<typeof getProjecItems>>

export default function ProjectInventoryTable({ allProjectItems }: ProjectInventoryTableProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-inventory'
  const DATAGRID_UNIQUE_KEY = 'project-individual-inventory'

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const thumbnailCellRender = useCallback((e: DataGridTypes.ColumnCellTemplateData) => {
    const data = e.data as DataSource[number]
    const thumbnail = data.item.thumbnail

    return <img src={thumbnail || '/images/placeholder-img.jpg'} className='size-[60px]' />
  }, [])

  const dateReceivedByCalculatedCellValue = useCallback((rowData: DataSource[number]) => {
    const dateReceivedBy = rowData?.dateReceivedByUser
    const fullName = `${dateReceivedBy?.fname}${dateReceivedBy?.lname ? ` ${dateReceivedBy?.lname}` : ''}`
    if (!dateReceivedBy || !fullName) return ''
    return fullName
  }, [])

  const handleOnContentReady = useCallback((e: DataGridTypes.ContentReadyEvent) => {
    const instance = e.component

    if (!instance) return

    const existing = instance.columnOption('availableToOrder', 'filterValues')

    //* only add filter if it does not exist
    if (existing === undefined) {
      instance.columnOption('availableToOrder', {
        filterValues: [0],
        filterType: 'exclude',
      })
    }
  }, [])

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/project/inventory/${data?.code}/view`)
  }, [])

  const renderCommonSummaryIItems = () => {
    return (
      <>
        <GroupItem
          column='availableToOrder'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='stockIn'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='stockOut'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />
        <GroupItem
          column='totalStock'
          summaryType='sum'
          displayFormat='{0}'
          valueFormat={DEFAULT_NUMBER_FORMAT}
          showInGroupFooter={false}
          alignByColumn={true}
        />

        <TotalItem column='availableToOrder' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='stockIn' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='stockOut' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
        <TotalItem column='totalStock' summaryType='sum' displayFormat='{0}' valueFormat={DEFAULT_NUMBER_FORMAT} />
      </>
    )
  }

  return (
    <div className='h-full w-full space-y-5'>
      <PageHeader title='Project Inventory' description='Manage and track your project individual inventory effectively'>
        <CommonPageHeaderToolbarItems
          dataGridUniqueKey={DATAGRID_UNIQUE_KEY}
          dataGridRef={dataGridRef}
          exportOptions={{ subjects: 'p-projects-individual-inventory', actions: 'export' }}
        />
      </PageHeader>

      <PageContentWrapper className='h-[calc(100%_-_92px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={allProjectItems}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          dataGridStore={dataGridStore}
          callbacks={{ onContentReady: handleOnContentReady }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='item.thumbnail' minWidth={150} caption='Thumbnail' cellRender={thumbnailCellRender} visible={false} />
          <Column dataField='projectIndividual.name' dataType='string' caption='Project' />
          <Column dataField='projectIndividual.projectGroup.name' dataType='string' caption='Group' visible={false} />
          <Column dataField='owner' dataType='string' caption='Owner' />

          <Column dataField='item.ItemCode' dataType='string' caption='MFG P/N' />
          <Column dataField='partNumber' dataType='string' caption='Part Number' />
          <Column dataField='item.FirmName' dataType='string' caption='Manufacturer' visible={false} />
          <Column dataField='mfr' dataType='string' caption='MFR' />
          <Column dataField='item.ItemName' dataType='string' caption='Description' visible={false} />
          <Column dataField='desc' dataType='string' caption='Desc' />

          <Column dataField='dateCode' minWidth={75} dataType='string' caption='DC' />
          <Column dataField='countryOfOrigin' minWidth={80} dataType='string' caption='COO' />
          <Column dataField='lotCode' dataType='string' caption='Lot Code' />
          <Column dataField='palletNo' dataType='string' caption='Pallet No' />
          <Column dataField='siteLocation' dataType='string' caption='Site Location' />
          <Column dataField='subLocation2' dataType='string' caption='Sub Location 2' />
          <Column dataField='subLocation3' dataType='string' caption='Sub Location 3' />
          {/* <Column dataField='warehouse.name' dataType='string' caption='Warehouse' /> */}

          {!isBusinessPartner && (
            <>
              <Column dataField='dateReceived' dataType='datetime' caption='Date Received' visible={false} />
              <Column
                dataField='dateReceivedBy'
                dataType='string'
                caption='Date Received By'
                calculateCellValue={dateReceivedByCalculatedCellValue}
                visible={false}
              />
            </>
          )}

          <Column dataField='packagingType' dataType='string' caption='Packaging Type' />
          <Column dataField='spq' dataType='string' caption='SPQ' />
          <Column dataField='cost' dataType='number' caption='Cost' alignment='left' format={DEFAULT_CURRENCY_FORMAT} />

          {!isBusinessPartner ? (
            <Column dataField='totalStock' dataType='number' caption='Total Stock' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
          ) : null}

          <Column dataField='notes' dataType='string' caption='Notes' visible={false} />

          <Column
            dataField='availableToOrder'
            dataType='number'
            caption='Available To Order'
            alignment='left'
            format={DEFAULT_NUMBER_FORMAT}
            fixed
            fixedPosition='right'
            filterType='exclude'
          />
          <Column dataField='stockIn' dataType='number' caption='Stock-In (In Process)' alignment='left' format={DEFAULT_NUMBER_FORMAT} />
          <Column dataField='stockOut' dataType='number' caption='Stock-Out (Delivered)' alignment='left' format={DEFAULT_NUMBER_FORMAT} />

          <Column dataField='createdAt' dataType='datetime' caption='Created At' visible={false} />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' visible={false} />

          <Summary>
            <GroupItem column='projectIndividual.name' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
            {renderCommonSummaryIItems()}
          </Summary>

          <Summary>
            <GroupItem
              column='projectIndividual.projectGroup.name'
              summaryType='count'
              displayFormat='{0} item'
              valueFormat={DEFAULT_NUMBER_FORMAT}
            />
            {renderCommonSummaryIItems()}
          </Summary>

          <Summary>
            <GroupItem column='item.ItemCode' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
            {renderCommonSummaryIItems()}
          </Summary>

          <Summary>
            <GroupItem column='item.FirmName' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
            {renderCommonSummaryIItems()}
          </Summary>

          <Summary>
            <GroupItem column='partNumber' summaryType='count' displayFormat='{0} item' valueFormat={DEFAULT_NUMBER_FORMAT} />
            {renderCommonSummaryIItems()}
          </Summary>

          <Column type='buttons' minWidth={140} fixed fixedPosition='right' caption='Actions'>
            <CanView subject='p-projects-individual-inventory' action={['view', 'view (owner)']}>
              <DataGridButton
                icon='eyeopen'
                onClick={handleView}
                cssClass='!text-lg'
                hint='View'
                visible={(opt) => {
                  const data = opt?.row?.data
                  return hideActionButton(data?.deletedAt || data?.deletedBy)
                }}
              />
            </CanView>
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>
    </div>
  )
}
