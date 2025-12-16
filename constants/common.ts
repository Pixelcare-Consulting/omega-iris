import { capitalize } from 'radash'

export const isProd = process.env.NODE_ENV === 'production'
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export const SYNC_STATUSES = ['pending', 'synced'] as const
export const SYNC_STATUSES_OPTIONS = SYNC_STATUSES.map((s) => ({ label: s.split(' ').map(str => capitalize(str.toLowerCase())).join(' '), value: s })) // prettier-ignore
