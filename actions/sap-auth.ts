'use server'

import fs from 'fs'
import ini from 'ini'

import { authenticateSapServiceLayer, logoutSapServiceLayer } from './sap-service-layer'
import logger from '@/utils/logger'
import { SapAuthCookies, SapCredentials, SapTokenConfig } from '@/types/sap'
import { EXPIRY_BUFFER, SESSION_TIMEOUT, TOKEN_FILE_PATH } from '@/constants/sap'

//* Generates or retrieves valid SAP Service Layer Authorization Cookies.
//* Checks if an existing token file exists and if the cookies are still valid.
//* If not valid or not present, generates new cookies and saves them to the file.

//? NOTE: In a production environment, ensure this file is stored in a secure location
//? with appropriate file permissions to prevent unauthorized access.
//? Consider encrypting the token within the file for added security.

type GetSapServiceLayerTokenResponse = {
  error?: boolean
  status: number
  message: string
  action: string
  data: { sapSession: SapAuthCookies | null }
}

//* In-process guard: concurrent callers share one login instead of each opening its own SAP session.
let refreshInflight: Promise<GetSapServiceLayerTokenResponse> | null = null

//* Reads the token file and returns the session only if it is still within the validity window.
function readValidSessionFromFile(): { config: SapTokenConfig; session: SapAuthCookies | null } {
  let config: SapTokenConfig = {}

  //* Check if the token file exists
  if (!fs.existsSync(TOKEN_FILE_PATH)) {
    logger.error('SAP Service Layer token file not found. Generating new cookies')
    return { config, session: null }
  }

  try {
    const fileContent = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8')
    config = ini.parse(fileContent)
  } catch (error) {
    logger.error(`Error reading or parsing SAP Service Layer token file: ${error}`)
    logger.error('Generating new SAP Service Layer token')
    return { config: {}, session: null }
  }

  //* Check if the existing cookies are still valid.
  //* Use the lifetime SAP reported at login, it is configurable per server (b1s.conf) and is often
  //* shorter than the 30 minute default. SESSION_TIMEOUT is only the fallback for older token files.

  //? ini.parse returns every value as a string, so coerce the numeric fields explicitly
  const storedTimeout = Number(config.sessionTimeout)
  const sessionTimeout = Number.isFinite(storedTimeout) && storedTimeout > 0 ? storedTimeout : SESSION_TIMEOUT
  const parsedGeneratedAt = Number(config.generatedAt)
  const generatedAt = Number.isFinite(parsedGeneratedAt) ? parsedGeneratedAt : 0
  const currentTime = Date.now()

  //* Add a buffer (e.g., 60 seconds) to the expiry check, never let the buffer swallow the whole window
  const validityWindow = Math.max(sessionTimeout - EXPIRY_BUFFER, 0)
  const isTokenValid = config.b1session && config.routeid && currentTime - generatedAt < validityWindow

  if (!isTokenValid) {
    logger.info('SAP Service Layer cookies expired or invalid. Generating new ones.')
    return { config, session: null }
  }

  return { config, session: { b1session: config.b1session!, routeid: config.routeid! } }
}

//* Marks the cached session as expired so the next call authenticates again.
//* SAP can end a session before its timeout elapses (service layer restart, admin logout in B1, node
//* change behind a load balancer). The time based check cannot see that, so a caller whose request was
//* rejected reports it here.

//? IMPORTANT: this does NOT call SAP's Logout, the session is already dead on SAP's side.
//? The cookies are deliberately kept and only generatedAt is zeroed, so the refresh path can still hand
//? them to logoutSapServiceLayer. If the rejection turns out to have been false and the session was
//? actually alive, that logout releases its license slot instead of leaking it until the timeout.
//? rejectedB1Session scopes the invalidation to the session that actually failed. Without it, concurrent
//? callers that all got rejected would each zero the file in turn and could wipe a good session that a
//? peer had just written, causing repeated logins.
export async function invalidateSapServiceLayerToken(rejectedB1Session?: string): Promise<void> {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) return

    const config: SapTokenConfig = ini.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf-8'))

    //* someone already replaced the rejected session, leave the new one alone
    if (rejectedB1Session && config.b1session !== rejectedB1Session) {
      logger.info('Rejected SAP session was already replaced, keeping the current one')
      return
    }

    config.generatedAt = 0

    fs.writeFileSync(TOKEN_FILE_PATH, ini.stringify(config))
    logger.warn('SAP Service Layer session marked as expired, the next call will authenticate again')
  } catch (error) {
    logger.error(`Failed to invalidate SAP Service Layer token file: ${error}`)
  }
}

export async function getSapServiceLayerToken(): Promise<GetSapServiceLayerTokenResponse> {
  //* Fast path: a valid session on disk needs no lock
  const cached = readValidSessionFromFile()

  if (cached.session) {
    logger.info('Using existing valid SAP Service Layer cookies.')

    return {
      status: 200,
      message: 'Using existing valid SAP Service Layer cookies.',
      data: { sapSession: cached.session },
      action: 'GET_SAP_SERVICE_LAYER_TOKEN',
    }
  }

  //* A refresh is already running, wait for it instead of opening a second SAP session
  if (refreshInflight) return refreshInflight

  refreshInflight = refreshSapServiceLayerToken().finally(() => {
    refreshInflight = null
  })

  return refreshInflight
}

//* Logs out the stale session and generates a new one. Only ever runs one at a time per process.
async function refreshSapServiceLayerToken(): Promise<GetSapServiceLayerTokenResponse> {
  //* Double-check: another process may have refreshed the file while we were queued
  const recheck = readValidSessionFromFile()

  if (recheck.session) {
    logger.info('Using SAP Service Layer cookies refreshed by a concurrent request.')

    return {
      status: 200,
      message: 'Using existing valid SAP Service Layer cookies.',
      data: { sapSession: recheck.session },
      action: 'GET_SAP_SERVICE_LAYER_TOKEN',
    }
  }

  const config = recheck.config

  //* logout old SAP session before generating so its license slot is released
  if (config.b1session && config.routeid) {
    await logoutSapServiceLayer({ b1session: config.b1session, routeid: config.routeid })
  }

  //* If no valid cookies exist, generate new ones
  const newSapSession = await generateNewSapServiceLayerToken()

  if (!newSapSession) {
    return {
      error: true,
      status: 500,
      message: 'SAP Session not found!',
      action: 'GET_SAP_SERVICE_LAYER_TOKEN',
      data: { sapSession: null },
    }
  }

  //* update config with new session details, persist the lifetime SAP reported so the next
  //* validity check uses the server's real timeout instead of an assumed one
  config.b1session = newSapSession.sapSession.b1session
  config.routeid = newSapSession.sapSession.routeid
  config.generatedAt = Date.now()
  config.sessionTimeout = newSapSession.sessionTimeout ?? SESSION_TIMEOUT

  //* Save the new session to the file
  try {
    const newFileContent = ini.stringify(config)
    fs.writeFileSync(TOKEN_FILE_PATH, newFileContent)
    logger.info(
      { tokenFile: TOKEN_FILE_PATH, generatedAt: config.generatedAt, sessionTimeout: config.sessionTimeout },
      'New SAP Service Layer session saved to file'
    )
  } catch (error) {
    logger.error(`Error writing SAP Service Layer token file: ${error}`)
  }

  return {
    status: 200,
    message: 'SAP Service Layer token generated successfully',
    action: 'GET_SAP_SERVICE_LAYER_TOKEN',
    data: { sapSession: newSapSession.sapSession },
  }
}

//* Generates new SAP Service Layer cookies by authenticating with the service layer.
async function generateNewSapServiceLayerToken(): Promise<{ sapSession: SapAuthCookies; sessionTimeout: number | null } | null> {
  try {
    const credentials: SapCredentials = {
      baseUrl: process.env.SAP_BASE_URL || '',
      companyDb: process.env.SAP_COMPANY_DB || '',
      userName: process.env.SAP_USERNAME || '',
      password: process.env.SAP_PASSWORD || '',
    }

    const response = await authenticateSapServiceLayer(credentials)

    if (response?.error || !response.data.sapSession) return null

    return { sapSession: response.data.sapSession, sessionTimeout: response.data.sessionTimeout }
  } catch (error) {
    logger.error('Failed to generate new SAP Service Layer token')
    return null
  }
}
