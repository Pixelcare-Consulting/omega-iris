export type PageMetadata = { title: string; description: string }
export type DuplicateFields = { field: string; name: string; message: string }[]

export type Stats = {
  total: number
  completed: number
  progress: number
  errors: ImportSyncError[]
  status: string //* "processing" | "completed" | "error"
}

export type ImportSyncErrorEntry = { field: string; message: string }

export type ImportSyncError = {
  rowNumber: number
  entries: ImportSyncErrorEntry[]
  row?: any
} & Record<string, any>
