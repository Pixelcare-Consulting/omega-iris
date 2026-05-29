'use client'

import { Column, DataGridTypes, DataGridRef, Button } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { isEqual } from 'radash'
import Tooltip from 'devextreme-react/tooltip'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'

import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import { PicProjectIndividualForm, picProjectIndividualsFormSchema } from '@/schema/project-individual'
import { updatePicPis } from '@/actions/project-individual'
import LoadingButton from '@/components/loading-button'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { usePiPicsByUserCode } from '@/hooks/safe-actions/project-individual-pic'
import { usePis } from '@/hooks/safe-actions/project-individual'

type UserPicProjectIndividualTabProps = {
  userCode: number
  projects: ReturnType<typeof usePis>
  piPics: ReturnType<typeof usePiPicsByUserCode>
}

export default function UserPicProjectIndividualTab({ userCode, projects, piPics }: UserPicProjectIndividualTabProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const DATAGRID_STORAGE_KEY = 'dx-datagrid-user-pic-project-individual'
  const DATAGRID_UNIQUE_KEY = 'user-pic-project-individuals'

  // const notificationContext = useContext(NotificationContext)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const currentAssignedProjects = useMemo(() => {
    if (piPics.isLoading || piPics.data.length < 1) return []
    return piPics.data.map((pc) => pc.projectIndividualCode)
  }, [JSON.stringify(piPics)])

  const values = useMemo(() => {
    if (currentAssignedProjects.length < 1) return { code: userCode, projects: [] }

    return {
      code: userCode,
      projects: currentAssignedProjects,
    }
  }, [userCode, JSON.stringify(currentAssignedProjects)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(picProjectIndividualsFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updatePicPis)

  const selectedRowKeys = useWatch({ control: form.control, name: 'projects' }) || []

  const dataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const handleView = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return
    router.push(`/project/individuals/${data.code}/view`)
  }, [])

  const handleOnSelectionChange = useCallback((e: DataGridTypes.SelectionChangedEvent) => {
    const selectedRowKeys = e.selectedRowKeys
    form.setValue('projects', selectedRowKeys)
    if (selectedRowKeys.length > 0) form.clearErrors('projects')
  }, [])

  const handleSave = (formData: PicProjectIndividualForm) => {
    if (!formData.code) return

    toast.promise(executeAsync(formData), {
      loading: "Updating projects's pics...",
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: "Failed to update projects's pics", expectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            piPics.execute({ userCode: userCode })
            // notificationContext?.handleRefresh()
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
      if (projects.isLoading || piPics.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [projects.isLoading, piPics.isLoading, dataGridRef.current])

  return (
    <div className='flex h-full w-full flex-col'>
      <Toolbar className='mt-5'>
        <Item location='after' locateInMenu='auto' widget='dxButton'>
          <Tooltip target='#save-button' contentRender={() => 'Save'} showEvent='mouseenter' hideEvent='mouseleave' position='top' />
          <LoadingButton
            id='save-button'
            icon='save'
            text={
              isEqual(currentAssignedProjects, selectedRowKeys)
                ? undefined
                : selectedRowKeys.length > 0
                  ? `${selectedRowKeys.length} selected`
                  : 'Clear'
            }
            isLoading={isExecuting}
            type='default'
            stylingMode='contained'
            disabled={isEqual(currentAssignedProjects.sort(), selectedRowKeys.sort())}
            onClick={() => form.handleSubmit(handleSave)()}
          />
        </Item>

        <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
      </Toolbar>

      <div className='min-h-0 flex-1 p-4'>
        <CommonDataGrid
          dataGridRef={dataGridRef}
          data={projects.data}
          isLoading={projects.isLoading}
          storageKey={DATAGRID_STORAGE_KEY}
          keyExpr='code'
          isSelectionEnable
          dataGridStore={dataGridStore}
          selectedRowKeys={selectedRowKeys}
          callbacks={{ onSelectionChanged: handleOnSelectionChange }}
        >
          <Column dataField='code' minWidth={100} dataType='string' caption='ID' sortOrder='asc' />
          <Column dataField='name' dataType='string' />
          <Column dataField='description' dataType='string' />
          <Column dataField='projectGroup.name' dataType='string' caption='Group' />
          <Column
            dataField='isActive'
            dataType='string'
            caption='Status'
            calculateCellValue={(rowData) => (rowData.isActive ? 'Active' : 'Inactive')}
          />
          {!isBusinessPartner && (
            <Column
              dataField='userSalesClosure'
              dataType='string'
              caption='Sales Closure'
              calculateCellValue={(rowData) => [rowData.userSalesClosure?.fname, rowData.userSalesClosure?.lname].filter(Boolean).join(' ')}
            />
          )}
          <Column dataField='createdAt' dataType='datetime' caption='Created At' />
          <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />

          <Column type='buttons' minWidth={100} fixed fixedPosition='right' caption='Actions'>
            <Button icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
          </Column>
        </CommonDataGrid>
      </div>
    </div>
  )
}
