type CommonErrorObj = { message: string }

export type PageMetadata = { title: string; description: string }
export type DuplicateFields = { field: string; name: string; message: string }[]

export type Stats = {
  total: number
  completed: number //* rows attempted (drives progress)
  synced: number //* rows actually written to DB/SAP (drives the message)
  progress: number
  errors: ImportSyncError[]
  status: string //* idle | "processing" | "completed" | "error"
}

export type FileUploadStats = {
  total: number
  completed: number
  progress: number
  errors: FileAttachmentError[]
  status: string //* idle | "processing" | "completed" | "error"
}

export type SyncSectionState = {
  stats: Stats
  errors: ImportSyncError[]
  showError: boolean
  showConfirmation: boolean
}

export type ImportSyncErrorEntry = { field: string; message: string }
export type FileAttachmentErrorEntry = CommonErrorObj
export type CommonErrorEntry = CommonErrorObj & Record<string, any>

export type ImportSyncError = {
  rowNumber: number
  entries: ImportSyncErrorEntry[]
  row?: any
} & Record<string, any>

export type FileAttachmentError = {
  rowNumber: number
  fileName: string
  entries: FileAttachmentErrorEntry[]
  row?: any
}

export type CommonOperationError = {
  id: number
  entries: CommonErrorEntry[]
  row?: any
}
