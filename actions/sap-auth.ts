'use server'

import { authenticateSapServiceLayer, logoutSapServiceLayer } from './sap-service-layer'
import logger from '@/utils/logger'
import { db } from '@/utils/db'
import { SapAuthCookies, SapCredentials } from '@/types/sap'
import { EXPIRY_BUFFER, SESSION_TIMEOUT } from '@/constants/sap'

//* one shared service account session per database, reused by every user
//! app signout must never log out of SAP, the session belongs to the database not the user

type GetSapServiceLayerTokenResponse = {
  error?: boolean
  status: number
  message: string
  action: string
  data: { sapSession: SapAuthCookies | null }
}

const ACTION = 'GET_SAP_SERVICE_LAYER_TOKEN'

//* one login at a time per database, so a slow login on one cannot stall another
const refreshInflight = new Map<string, Promise<GetSapServiceLayerTokenResponse>>()

function okResponse(sapSession: SapAuthCookies, message: string): GetSapServiceLayerTokenResponse {
  return { status: 200, message, action: ACTION, data: { sapSession } }
}

function errorResponse(message: string): GetSapServiceLayerTokenResponse {
  return { error: true, status: 500, message, action: ACTION, data: { sapSession: null } }
}

//* returns the stored session only while it is still inside its validity window
async function readValidSession(dbCode: string) {
  const stored = await db.sapSession.findUnique({ where: { dbCode } })

  if (!stored) return { stored: null, session: null }

  const isValid = !!stored.b1Session && !!stored.routeId && stored.expiresAt.getTime() - EXPIRY_BUFFER > Date.now()

  if (!isValid) {
    logger.info({ dbCode }, 'SAP session expired or invalid, generating a new one')
    return { stored, session: null }
  }

  return { stored, session: { b1session: stored.b1Session, routeid: stored.routeId! } }
}

//* marks the session expired so the next call logs in again
//? SAP can end a session before its timeout (service layer restart, admin logout), the time check cannot see that
//! keeps the cookies on purpose — the refresh path still needs them to log the old session out and free its license
export async function invalidateSapServiceLayerToken(dbCode: string, rejectedB1Session?: string): Promise<void> {
  try {
    const stored = await db.sapSession.findUnique({ where: { dbCode } })

    if (!stored) return

    //* someone already replaced the rejected session, leave the new one alone
    if (rejectedB1Session && stored.b1Session !== rejectedB1Session) {
      logger.info({ dbCode }, 'Rejected SAP session was already replaced, keeping the current one')
      return
    }

    await db.sapSession.update({ where: { dbCode }, data: { expiresAt: new Date(0) } })
    logger.warn({ dbCode }, 'SAP session marked as expired, the next call will authenticate again')
  } catch (error) {
    logger.error(`Failed to invalidate SAP session for ${dbCode}: ${error}`)
  }
}

export async function getSapServiceLayerToken(dbCode: string): Promise<GetSapServiceLayerTokenResponse> {
  if (!dbCode) return errorResponse('No SAP database selected.')

  //* fast path, a valid session needs no lock
  const cached = await readValidSession(dbCode)

  if (cached.session) return okResponse(cached.session, 'Using existing valid SAP Service Layer cookies.')

  //* a refresh for this database is already running, wait for it instead of opening a second session
  const inflight = refreshInflight.get(dbCode)

  if (inflight) return inflight

  const refresh = refreshSapServiceLayerToken(dbCode).finally(() => refreshInflight.delete(dbCode))

  refreshInflight.set(dbCode, refresh)

  return refresh
}

//* logs the stale session out and generates a new one, only ever one at a time per database
async function refreshSapServiceLayerToken(dbCode: string): Promise<GetSapServiceLayerTokenResponse> {
  //* another caller may have refreshed while we were queued
  const recheck = await readValidSession(dbCode)

  if (recheck.session) return okResponse(recheck.session, 'Using existing valid SAP Service Layer cookies.')

  //* an override can pass any string, check it is a real active database before logging in
  const sapDatabase = await db.sapDatabase.findFirst({ where: { dbCode, isActive: true } })

  if (!sapDatabase) {
    //* the database was turned off while it still had a session, log it out instead of leaking its license
    if (recheck.stored?.b1Session) {
      await logoutSapServiceLayer({ b1session: recheck.stored.b1Session, routeid: recheck.stored.routeId ?? undefined })
      await db.sapSession.delete({ where: { dbCode } }).catch(() => null)
    }

    return errorResponse(`SAP database "${dbCode}" was not found or is inactive.`)
  }

  //* log the old session out first so its license slot is released
  if (recheck.stored?.b1Session) {
    await logoutSapServiceLayer({ b1session: recheck.stored.b1Session, routeid: recheck.stored.routeId ?? undefined })
  }

  const newSapSession = await generateNewSapServiceLayerToken(dbCode)

  if (!newSapSession) return errorResponse('SAP Session not found!')

  //* store the lifetime SAP reported so the next check uses the server's real timeout
  const expiresAt = new Date(Date.now() + (newSapSession.sessionTimeout ?? SESSION_TIMEOUT))
  const { b1session, routeid } = newSapSession.sapSession

  try {
    await db.sapSession.upsert({
      where: { dbCode },
      create: { dbCode, b1Session: b1session, routeId: routeid, expiresAt },
      update: { b1Session: b1session, routeId: routeid, expiresAt },
    })

    logger.info({ dbCode, expiresAt }, 'New SAP Service Layer session saved')
  } catch (error) {
    //! the login held a license slot that nothing can reach now, log it out instead of leaking it
    logger.error(`Failed to save the SAP session for ${dbCode}, logging it back out: ${error}`)
    await logoutSapServiceLayer({ b1session, routeid })

    return errorResponse('Could not store the new SAP session.')
  }

  return okResponse(newSapSession.sapSession, 'SAP Service Layer token generated successfully')
}

//* logs in with the shared service account, only CompanyDB varies per database
async function generateNewSapServiceLayerToken(
  dbCode: string
): Promise<{ sapSession: SapAuthCookies; sessionTimeout: number | null } | null> {
  try {
    const credentials: SapCredentials = {
      baseUrl: process.env.SAP_BASE_URL || '',
      companyDb: dbCode,
      userName: process.env.SAP_USERNAME || '',
      password: process.env.SAP_PASSWORD || '',
    }

    const response = await authenticateSapServiceLayer(credentials)

    if (response?.error || !response.data.sapSession) return null

    return { sapSession: response.data.sapSession, sessionTimeout: response.data.sessionTimeout }
  } catch (error) {
    logger.error(`Failed to generate a new SAP Service Layer token for ${dbCode}`)
    return null
  }
}
