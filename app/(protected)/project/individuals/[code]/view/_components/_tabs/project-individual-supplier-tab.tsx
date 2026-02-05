'use client'

import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { isEqual } from 'radash'
import Tooltip from 'devextreme-react/tooltip'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import { ProjectIndividualSupplierForm, projectIndividualSupplierFormSchema } from '@/schema/project-individual'
import { updatePiSuppliers } from '@/actions/project-individual'
import LoadingButton from '@/components/loading-button'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { useBps } from '@/hooks/safe-actions/business-partner'

type ProjectIndividualSupplierTabProps = {
  projectCode: number
  suppliers: string[]
  bps: ReturnType<typeof useBps>
}
type DataSource = ReturnType<typeof useBps>['data']

export default function ProjectIndividualSupplierTab({ projectCode, suppliers, bps }: ProjectIndividualSupplierTabProps) {
  const router = useRouter()

  console.log({ suppliers })

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-project-individual-supplier'
  const DATAGRID_UNIQUE_KEY = 'project-individual-suppliers'

  const form = useForm({
    mode: 'onChange',
    values: { code: projectCode, suppliers },
    resolver: zodResolver(projectIndividualSupplierFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updatePiSuppliers)

  const selectedRowKeys = useWatch({ control: form.control, name: 'suppliers' }) || []

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/suppliers/${data?.code}/view`)
  }, [])

  const handleOnSelectionChange = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const selectedRowKeys = e.selectedRowKeys
    form.setValue('suppliers', selectedRowKeys)
    if (selectedRowKeys.length > 0) form.clearErrors('suppliers')
  }, [])

  function handleOnCellPrepared(e: DataGridTypes.CellPreparedEvent) {
    const column = e.column as any
    const data = e.data
    const cellElement = e.cellElement
    const checkbox = (cellElement?.querySelector('.dx-select-checkbox') as HTMLInputElement) || null
    const rowType = e.rowType

    if (rowType === 'data') {
      //* condition when column type is selection
      if (column?.type === 'selection') {
        if (data?.deletedAt || data?.deletedBy) {
          if (checkbox) checkbox.style.display = 'none' //* hide checkbox if row has deletedAt or deletedBy
        }
      }
    }
  }

  const handleSave = (formData: ProjectIndividualSupplierForm) => {
    if (!formData.code) return

    toast.promise(executeAsync(formData), {
      loading: 'Updating suppliers...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to update suppliers!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
          }, 1000)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (bps.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [bps.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#save-button' contentRender={() => 'Save'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <LoadingButton
            id='save-button'
            icon='save'
            text={
              isEqual(suppliers, selectedRowKeys) ? undefined : selectedRowKeys.length > 0 ? `${selectedRowKeys.length} selected` : 'Clear'
            }
            isLoading={isExecuting}
            type='default'
            stylingMode='contained'
            disabled={isEqual(suppliers, selectedRowKeys)}
            onClick={() => form.handleSubmit(handleSave)()}
          />
        </Item>

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      {form?.formState?.errors?.suppliers && <div className='px-4 text-xs text-red-500'>{form.formState.errors.suppliers.message}</div>}

      <PageContentWrapper className='max-h-[calc(100%_-_68px)]'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={bps.data}
          isLoading={bps.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='CardCode'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onRowClick: handleView, onSelectionChanged: handleOnSelectionChange, onCellPrepared: handleOnCellPrepared }}
        >
          <Column dataField='code' dataType='string' minWidth={100} caption='ID' sortOrder='asc' />
          <Column dataField='CardCode' dataType='string' caption='Code' />
          <Column dataField='CardName' dataType='string' caption='Name' />
          <Column dataField='GroupName' dataType='string' caption='Group' />
          <Column dataField='CurrName' dataType='string' caption='Currency' />
          <Column dataField='PymntGroup' dataType='string' caption='Payment Term' />
          <Column dataField='AcctType' dataType='string' caption='Account Type' />
          <Column dataField='syncStatus' dataType='string' caption='Sync Status' cssClass='capitalize' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />

          <Column type='buttons' minWidth={100} fixed fixedPosition='right' caption='Actions'>
            <Button icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
          </Column>
        </CommonDataGrid>
      </PageContentWrapper>
    </div>
  )
}
