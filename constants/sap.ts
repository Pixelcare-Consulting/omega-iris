//* SAP Configs Constants
export const REQUEST_TIMEOUT = 30_000 //* 30 seconds
export const SESSION_TIMEOUT = 1800 * 1000 //* 30 minutes in milliseconds
export const EXPIRY_BUFFER = 60 * 1000 //* 60 seconds

export const SAP_BASE_URL = process.env.SAP_BASE_URL
export const SYNC_TO_SAP_CHUNK_SIZE = 10

//! SAP pages every list by default (20 rows), so a lookup with no Prefer header silently returns only the first 20
//* 0 turns paging off and returns every row — only for lookups small enough to fit one response
export const SAP_NO_PAGINATION = 'odata.maxpagesize=0'

//* SAP Service Layer APIs Constants

//* Item Master
export const ITEM_MASTER_MAX_PAGE_SIZE = 5000

//* Business Partner Master
export const BP_MASTER_MAX_PAGE_SIZE = 50
export const BP_MASTER_MAX_CARD_CODE_DIGITS = 5

//* Warehouse Sublevel Codes
export const WAREHOUSE_SUBLEVEL_CODES_MAX_PAGE_SIZE = 500

//* Warehouse Master
export const WAREHOUSE_MASTER_MAX_PAGE_SIZE = 999

//* Warehouse Bin Locations
export const WAREHOUSE_BIN_LOCATION_MAX_PAGE_SIZE = 500

//* Batch
export const BATCH_MASTER_MAX_PAGE_SIZE = 1000

//* Project Item Sync (batch details of every portal-synced warehouse)
export const PROJECT_ITEM_SYNC_META_CODE = 'project-item-batch'

//* lives here, not with the job, so client components can ask for the schedule without pulling the job into the bundle
export const PROJECT_ITEM_SYNC_JOB_CODE = 'project-item-sync'

export const PROJECT_ITEM_SYNC_QUERY_CODE = 'delivery-batch-details-by-sync-warehouses'
export const PROJECT_ITEM_SYNC_COUNT_QUERY_CODE = 'delivery-batch-details-by-sync-warehouses-count'
export const PROJECT_ITEM_SYNC_MAX_PAGE_SIZE = 1000

//* Item Stock By Warehouse
export const ITEM_STOCK_BY_WAREHOUSE_MAX_PAGE_SIZE = 1000
