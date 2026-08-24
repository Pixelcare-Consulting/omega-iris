import { isValid, parse, parseISO } from 'date-fns'

export function parseSapCompactDate(datePart?: string | null) {
  //* datePart: e.g. "20210625" - compact yyyyMMdd returned by the SAP SQL query endpoints,
  //* unlike the OData crossjoin endpoints which return "2026-07-21" (see combineSapDateTime)

  if (!datePart) return null

  const trimmed = String(datePart).trim()
  if (trimmed.length < 8) return null

  const parsed = parse(trimmed.slice(0, 8), 'yyyyMMdd', new Date())

  return isValid(parsed) ? parsed : null
}

export function combineSapDateTime(datePart?: string | null, timePart?: string | null) {
  //* datePart: e.g. "2026-07-21"
  //* timePart: e.g. "19:52:01"

  if (!datePart) return null

  const dateOnly = datePart.slice(0, 10)
  const safeTime = timePart || '00:00:00'
  const combinedISO = `${dateOnly}T${safeTime}.000Z`

  return parseISO(combinedISO)
}
