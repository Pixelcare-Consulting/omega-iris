//* SAP Configs Constants
export const TOKEN_FILE_PATH = './SAP-Service-Layer-Authorization-Token.ini'

export const REQUEST_TIMEOUT = 30_000 //* 30 seconds
export const SESSION_TIMEOUT = 1800 * 1000 //* 30 minutes in milliseconds
export const EXPIRY_BUFFER = 60 * 1000 //* 60 seconds

export const SAP_BASE_URL = process.env.SAP_BASE_URL
export const SYNC_TO_SAP_CHUNK_SIZE = 10

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
