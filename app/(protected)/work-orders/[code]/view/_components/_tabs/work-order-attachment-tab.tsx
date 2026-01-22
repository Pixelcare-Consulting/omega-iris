'use client'

import { Column, DataGridTypes, DataGridRef, Button as DataGridButton } from 'devextreme-react/data-grid'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'nextjs-toploader/app'
import { useAction } from 'next-safe-action/hooks'
import Toolbar from 'devextreme-react/toolbar'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'
import ScrollView from 'devextreme-react/scroll-view'
import { formatBytes } from 'bytes-formatter'
import Button from 'devextreme-react/button'
import ProgressBar from 'devextreme-react/progress-bar'

import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { useDataGridStore } from '@/hooks/use-dx-datagrid'
import CommonPageHeaderToolbarItems from '@/app/(protected)/_components/common-page-header-toolbar-item'
import CommonDataGrid from '@/components/common-datagrid'
import { COMMON_DATAGRID_STORE_KEYS } from '@/constants/devextreme'
import { getWorkOrderByCode } from '@/actions/work-order'
import { useFileAttachmentsByRefCode } from '@/hooks/safe-actions/file-attachment'
import { FileAttachmentForm, fileAttachmentFormSchema } from '@/schema/file-attachment'
import { safeParseInt } from '@/utils'
import FileUploaderField from '@/components/forms/file-uploader-field'
import AlertDialog from '@/components/alert-dialog'
import Alert from '@/components/alert'
import { deleteFileAttachment, uploadFileAttachment } from '@/actions/file-attachment'
import { FileAttachmentError, FileUploadStats } from '@/types/common'
import FileUploadErrorDataGrid from '@/components/file-upload-error-datagrid'
import WorkOrderAttachmentView from '../work-order-attachment-view'
import { useSession } from 'next-auth/react'
import { hideActionButton } from '@/utils/devextreme'

type WorkOrderAttachmentTabProps = {
  workOrder: NonNullable<Awaited<ReturnType<typeof getWorkOrderByCode>>>
  fileAttachments: ReturnType<typeof useFileAttachmentsByRefCode>
}

type DataSource = Record<string, any> & ReturnType<typeof useFileAttachmentsByRefCode>['data'][number]

export default function WorkOrderAttachmentTab({ workOrder, fileAttachments }: WorkOrderAttachmentTabProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const DATAGRID_STORAGE_KEY = `dx-datagrid-work-order-${workOrder.code}-attachment`
  const DATAGRID_UNIQUE_KEY = `work-order-${workOrder.code}-attachments`

  const dataGridRef = useRef<DataGridRef | null>(null)
  const fileUploadErrorDataGridRef = useRef<DataGridRef | null>(null)

  const dataGridStore = useDataGridStore(COMMON_DATAGRID_STORE_KEYS)

  const [stats, setStats] = useState<FileUploadStats>({ total: 0, completed: 0, progress: 0, errors: [], status: 'processing' })

  const [rowData, setRowData] = useState<DataSource | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [showUploadConfirmation, setShowUploadConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showFileUploadError, setShowFileUploadError] = useState(false)
  const [fileUploadErrors, setFileUploadErrors] = useState<FileAttachmentError[]>([])

  const form = useForm({
    mode: 'onChange',
    values: { files: [] },
    resolver: zodResolver(fileAttachmentFormSchema),
  })

  const files = useWatch({ control: form.control, name: 'files' })

  const uploadFileAttachmentData = useAction(uploadFileAttachment)
  const deleteFileAttachmentData = useAction(deleteFileAttachment)

  const isBusinessPartner = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'business-partner'
  }, [JSON.stringify(session)])

  const handleView = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setRowData(data)
      setIsViewMode(true)
    },
    [setRowData, setIsViewMode]
  )

  const handleViewClose = useCallback(() => {
    setRowData(null)
    setIsViewMode(false)
  }, [])

  const handleOpen = useCallback((e: DataGridTypes.ColumnButtonClickEvent) => {
    const data = e.row?.data
    if (!data) return

    try {
      window.open(`/api/file-attachments/${data.code}`, '_blank')
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to view document')
    }
  }, [])

  const handleDelete = useCallback(
    (e: DataGridTypes.ColumnButtonClickEvent) => {
      const data = e.row?.data
      if (!data) return
      setShowDeleteConfirmation(true)
      setRowData(data)
    },
    [setShowDeleteConfirmation, setRowData]
  )

  const handleUploadConfirm = async (formValues: FileAttachmentForm) => {
    setShowUploadConfirmation(false)

    try {
      const batchSize = 3

      const toUploadFiles = formValues.files.map((file, i) => {
        const formData = new FormData()
        formData.append('file', file)

        return {
          rowNumber: i + 1,
          formData,
        }
      })

      let batch: typeof toUploadFiles = []
      let stats: FileUploadStats = { total: 0, completed: 0, progress: 0, errors: [], status: 'processing' }

      for (let i = 0; i < toUploadFiles.length; i++) {
        const isLast = i === toUploadFiles.length - 1
        const file = toUploadFiles[i]

        //* add to batch
        batch.push(file)

        //* check if batch size is reached or last row
        if (batch.length === batchSize || isLast) {
          const response = await uploadFileAttachmentData.executeAsync({
            files: batch,
            modelName: 'work-orders',
            refCode: workOrder.code,
            total: toUploadFiles.length,
            stats,
            isLast,
          })

          const result = response?.data

          if (result?.error) {
            setStats((prev: any) => ({ ...prev, errors: [...prev.errors, ...result.stats.errors] }))
            stats.errors = [...stats.errors, ...result.stats.errors]
          } else if (result?.stats) {
            setStats(result.stats)
            stats = result.stats
          }

          batch = []
        }

        if (stats.status === 'completed') {
          toast.success(`File${toUploadFiles.length > 1 ? 's' : ''} uploaded successfully! ${stats.errors.length} errors found.`)
          setStats((prev: any) => ({ ...prev, total: 0, completed: 0, progress: 0, status: 'processing' }))
          form.reset()
          fileAttachments.executeAsync({ modelName: 'work-orders', refCode: workOrder.code })
        }

        if (stats.errors.length > 0) {
          setShowFileUploadError(true)
          setFileUploadErrors(stats.errors)
        }
      }
    } catch (error: any) {
      console.error(error)
      form.reset()
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleDeleteConfirm = (code?: number) => {
    if (!code) return

    setShowDeleteConfirmation(false)

    toast.promise(deleteFileAttachmentData.executeAsync({ code }), {
      loading: 'Deleting attachment...',
      success: (response) => {
        const result = response?.data

        if (!response || !result) throw { message: 'Failed to delete attachment!', unExpectedError: true }

        if (!result.error) {
          setTimeout(() => {
            router.refresh()
            fileAttachments.executeAsync({ modelName: 'work-orders', refCode: workOrder.code })
          }, 1500)

          return result.message
        }

        throw { message: result.message, expectedError: true }
      },
      error: (err: Error & { expectedError: boolean }) => {
        return err?.expectedError ? err.message : 'Something went wrong! Please try again later.'
      },
    })
  }

  useEffect(() => {
    console.log({ errors: form.formState.errors })
  }, [form.formState.errors])

  //* show loading
  useEffect(() => {
    if (dataGridRef.current) {
      if (fileAttachments.isLoading) dataGridRef.current.instance().beginCustomLoading('Loading data...')
      else dataGridRef.current.instance().endCustomLoading()
    }
  }, [fileAttachments.isLoading, dataGridRef.current])

  return (
    <TabPanel
      width='100%'
      height='100%'
      animationEnabled
      tabsPosition='left'
      defaultSelectedIndex={0}
      onSelectionChanged={() => form.reset()}
    >
      <TabPanelITem icon='upload'>
        <ScrollView>
          <div className='grid h-full w-full grid-cols-12 gap-5 p-5'>
            <div className='col-span-12 flex h-[540px] flex-col items-start gap-4'>
              <div className='flex w-full flex-wrap items-center justify-between gap-4'>
                <div>
                  <Alert
                    variant='default'
                    message='Uploading a file will overwrite the existing file with the same name. Allowed characters are letters (a-z A-Z), numbers (0-9), underscore (_), dash (-) and dot (.).'
                  />
                </div>

                <div className='flex items-center gap-1'>
                  <Button
                    text={uploadFileAttachmentData.isExecuting ? 'Uploading...' : 'Upload'}
                    stylingMode='contained'
                    type='default'
                    disabled={files?.length < 1 || uploadFileAttachmentData.isExecuting}
                    onClick={() => setShowUploadConfirmation(true)}
                  />
                  <Button
                    text='Clear'
                    stylingMode='outlined'
                    type='default'
                    disabled={files?.length < 1 || uploadFileAttachmentData.isExecuting}
                    onClick={() => form.reset()}
                  />
                </div>

                {stats && stats.progress ? (
                  <ProgressBar className='w-full' min={0} max={100} showStatus={false} value={stats.progress} />
                ) : null}
              </div>

              <div>
                <FormProvider {...form}>
                  <FileUploaderField
                    control={form.control}
                    name='files'
                    isRequired
                    isMulti
                    isConvertToBase64={false}
                    extendedProps={{
                      uploaderContainerClassName: 'w-full h-[280px]',
                      formDescription: { className: 'text-center block' },
                    }}
                  />
                </FormProvider>

                <AlertDialog
                  isOpen={showUploadConfirmation}
                  title='Are you sure?'
                  description={`Are you sure you want to upload these ${files?.length} files?.`}
                  onConfirm={() => form.handleSubmit(handleUploadConfirm)()}
                  onCancel={() => setShowUploadConfirmation(false)}
                />

                <FileUploadErrorDataGrid
                  isOpen={showFileUploadError}
                  setIsOpen={setShowFileUploadError}
                  data={fileUploadErrors}
                  dataGridRef={fileUploadErrorDataGridRef}
                />
              </div>
            </div>
          </div>
        </ScrollView>
      </TabPanelITem>

      <TabPanelITem icon='bulletlist'>
        {!isViewMode ? (
          <>
            <Toolbar className='mt-5'>
              <CommonPageHeaderToolbarItems dataGridUniqueKey={DATAGRID_UNIQUE_KEY} dataGridRef={dataGridRef} />
            </Toolbar>

            {/* // TODO: double check the height of pageContentWrapper when datagrid has more than 10 rows */}
            <PageContentWrapper className='h-[calc(100%_-_68px)] pb-0'>
              <CommonDataGrid
                dataGridRef={dataGridRef}
                data={fileAttachments.data}
                isLoading={fileAttachments.isLoading}
                storageKey={DATAGRID_STORAGE_KEY}
                dataGridStore={dataGridStore}
              >
                <Column dataField='name' dataType='string' sortOrder='asc' />
                <Column dataField='type' dataType='string' />
                <Column dataField='uploadedAt' dataType='datetime' caption='Uploaded At' />
                <Column dataField='updatedAt' dataType='datetime' caption='Updated At' />
                <Column
                  dataField='size'
                  dataType='number'
                  alignment='left'
                  calculateCellValue={(rowData) => formatBytes(safeParseInt(rowData.size))}
                />

                <Column type='buttons' fixed fixedPosition='right' minWidth={140} caption='Actions'>
                  <DataGridButton icon='eyeopen' onClick={handleView} cssClass='!text-lg' hint='View' />
                  <DataGridButton icon='activefolder' onClick={handleOpen} cssClass='!text-lg' hint='Open' />
                  <DataGridButton
                    icon='trash'
                    onClick={handleDelete}
                    cssClass='!text-lg !text-red-500'
                    hint='Delete'
                    visible={hideActionButton(isBusinessPartner)}
                  />
                </Column>
              </CommonDataGrid>

              <AlertDialog
                isOpen={showDeleteConfirmation}
                title='Are you sure?'
                description={`Are you sure you want to permanently delete this attachment with name "${rowData?.name}"?.`}
                onConfirm={() => handleDeleteConfirm(rowData?.code)}
                onCancel={() => setShowDeleteConfirmation(false)}
              />
            </PageContentWrapper>
          </>
        ) : rowData ? (
          <WorkOrderAttachmentView data={rowData} onClose={handleViewClose} />
        ) : null}
      </TabPanelITem>
    </TabPanel>
  )
}
