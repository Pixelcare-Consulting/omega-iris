export type PageMetadata = { title: string; description: string }
export type DuplicateFields = { field: string; name: string; message: string }[]

export type ImportErrorEntry = { field: string; message: string }

export type ImportError = {
  rowNumber: number
  entries: ImportErrorEntry[]
  row?: any
}
