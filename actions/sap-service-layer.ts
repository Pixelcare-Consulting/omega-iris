'use server'

import axios from 'axios'
import https from 'https'

import { REQUEST_TIMEOUT, SAP_BASE_URL } from '@/constants/sap'
import { SapCredentials, SapAuthCookies } from '@/types/sap'
import logger from '@/utils/logger'
import { getSapServiceLayerToken, invalidateSapServiceLayerToken } from './sap-auth'

type AuthenticateSapServiceLayerResponse = {
  error?: boolean
  status: number
  message: string
  action: string
  //* sessionTimeout is the lifetime in ms reported by SAP on login, null when it could not be determined
  data: { sapSession: SapAuthCookies | null; sessionTimeout: number | null }
}

export async function authenticateSapServiceLayer(credentials: SapCredentials): Promise<AuthenticateSapServiceLayerResponse> {
  if (process.env.SAP_SECURITY_STRICT === 'false') {
    logger.warn(`PASS THROUGH MODE: Authenticate with SAP Service Layer`)

    return {
      error: true,
      status: 500,
      message: 'PASS THROUGH MOD: SAP Authentication failed!',
      action: 'AUTH_SAP_SERVICE_LAYER',
      data: { sapSession: null, sessionTimeout: null },
    }
  }

  try {
    //* clean the base URL and construct the login endpoint, remove trailing slash
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '')
    const loginUrl = `${baseUrl}/b1s/v1/Login`

    logger.info('Attempting to authenticate with SAP Service Layer')

    //* create agent
    const agent = new https.Agent({ rejectUnauthorized: false, timeout: REQUEST_TIMEOUT })

    //* create request
    const response = await axios.post(
      loginUrl,
      { CompanyDB: credentials.companyDb, UserName: credentials.userName, Password: credentials.password },
      { httpsAgent: agent, timeout: REQUEST_TIMEOUT, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
    )

    //* set cookie
    const setCookieHeader = response.headers['set-cookie']
    let b1sessionCookie = ''
    let routeidCookie = ''

    if (setCookieHeader) {
      setCookieHeader.forEach((cookie: string) => {
        if (cookie.startsWith('B1SESSION=')) b1sessionCookie = cookie.split(';')[0]
        else if (cookie.startsWith('ROUTEID=')) routeidCookie = cookie.split(';')[0]
      })
    }

    if (!b1sessionCookie || !routeidCookie) {
      logger.error('Failed to extract session cookies from SAP response')

      //* the login itself succeeded on SAP's side, so a license slot is already held even though we
      //* cannot use the session. Release it instead of letting it linger until the session timeout.
      if (b1sessionCookie) {
        logger.warn('Logging out the partially created SAP session to release its license slot')
        await logoutSapServiceLayer({ b1session: b1sessionCookie, routeid: routeidCookie || undefined })
      }

      throw new Error('Failed to extract session cookies from SAP response')
    }

    //* SAP reports the real session lifetime in minutes, it is configurable per server in b1s.conf,
    //* so prefer it over any assumed value. Fall back to null when the response omits it.
    const reportedTimeout = Number(response.data?.SessionTimeout)
    const sessionTimeout = Number.isFinite(reportedTimeout) && reportedTimeout > 0 ? reportedTimeout * 60 * 1000 : null

    if (sessionTimeout === null) {
      logger.warn('SAP did not report a SessionTimeout on login, falling back to the assumed session lifetime')
    }

    logger.info({ sessionTimeoutMinutes: sessionTimeout ? sessionTimeout / 60_000 : null }, 'SAP Service Layer authentication successful')

    //* return session
    return {
      status: 200,
      message: 'SAP Service Layer authentication successful',
      action: 'AUTH_SAP_SERVICE_LAYER',
      data: { sapSession: { b1session: b1sessionCookie, routeid: routeidCookie }, sessionTimeout },
    }
  } catch (error: any) {
    const errorMessage =
      error.code === 'ETIMEDOUT'
        ? `Connection timeout to SAP server (${credentials.baseUrl}). Please check if the server is accessible.`
        : `SAP Service Layer authentication failed: ${error.message}`

    logger.error(errorMessage)

    return {
      error: true,
      status: 500,
      message: errorMessage,
      action: 'AUTH_SAP_SERVICE_LAYER',
      data: { sapSession: null, sessionTimeout: null },
    }
  }
}

type CallSapServiceLayerApiParams = {
  url: string
  method?: 'get' | 'post' | 'patch' | 'delete'
  headers?: Record<string, any>
  data?: any
  params?: Record<string, any>
}

//* Builds a failure payload in SAP's own OData error shape ({ error: { code, message: { lang, value } } }).
//? IMPORTANT: callers detect SAP failures via `response?.error?.message?.value`. Returning null/undefined
//? on failure made a failed call indistinguishable from a successful one, so a network error or a failed
//? login silently counted as success (e.g. rows marked syncStatus 'synced' that never reached SAP).
function buildSapErrorResponse(code: string, value: string) {
  return { error: { code, message: { lang: 'en-us', value } } }
}

//* True when SAP rejected the session itself rather than the request.
//* SAP answers 401 with { error: { code: 301, message: { value: 'Invalid session.' } } }, some builds
//* report -2001 instead.

//? Keep this narrow. The cached session is shared by every user, so a false positive here forces an
//? app wide re-login, never widen it to "any error".
function isSessionRejected(error: any): boolean {
  const status = error?.response?.status
  const sapCode = error?.response?.data?.error?.code
  const sapMessage = String(error?.response?.data?.error?.message?.value || '')

  if (status === 401) return true
  if (sapCode === 301 || sapCode === -2001 || sapCode === '301' || sapCode === '-2001') return true

  return /invalid session|session (has )?(expired|terminated)/i.test(sapMessage)
}

export async function callSapServiceLayerApi(config: CallSapServiceLayerApiParams): Promise<any> {
  if (process.env.SAP_SECURITY_STRICT === 'false') {
    logger.warn(`PASS THROUGH MODE: ${config.url}`)
    return buildSapErrorResponse('PASS_THROUGH_MODE', 'SAP is in pass through mode, the request was not sent.')
  }

  const firstAttempt = await sendSapServiceLayerRequest(config)

  if (!firstAttempt.sessionRejected) return firstAttempt.data

  //* the cached session is dead ahead of its expiry, drop it and try once with a fresh login
  logger.warn(`${config.url} - SAP rejected the cached session, re-authenticating and retrying once`)
  await invalidateSapServiceLayerToken(firstAttempt.usedB1Session)

  const retry = await sendSapServiceLayerRequest(config)

  //* only one retry, a second rejection is a real failure and must not loop
  if (retry.sessionRejected) logger.error(`${config.url} - SAP rejected the session again after re-authenticating`)

  return retry.data
}

//* Performs a single request. Reports whether SAP rejected the session so the caller can decide to
//* re-authenticate, without retrying genuine request errors (bad payload, missing entity, timeout).
async function sendSapServiceLayerRequest(
  config: CallSapServiceLayerApiParams
): Promise<{ data: any; sessionRejected: boolean; usedB1Session?: string }> {
  //* the session this attempt actually used, so an invalidation can be scoped to it
  let usedB1Session: string | undefined

  try {
    //* create agent
    const agent = new https.Agent({ rejectUnauthorized: false })

    //* Get the SAP Service Layer API Authorization cookies
    const authCookies = await getSapServiceLayerToken()

    if (
      authCookies.error ||
      !authCookies?.data ||
      !authCookies?.data?.sapSession ||
      !authCookies?.data?.sapSession?.b1session ||
      !authCookies?.data?.sapSession?.routeid
    ) {
      logger.error(`${config.url} - No usable SAP session, request not sent`)

      //* login itself failed, retrying with another login would just fail the same way
      return {
        data: buildSapErrorResponse('SAP_AUTH_FAILED', authCookies?.message || 'Could not obtain a SAP Service Layer session.'),
        sessionRejected: false,
      }
    }

    const sapSession = authCookies.data.sapSession

    usedB1Session = sapSession.b1session

    const response = await axios({
      url: config.url,
      method: config.method ?? 'get',
      headers: {
        Cookie: `${sapSession.b1session}; ${sapSession.routeid}`,
        'Content-Type': 'application/json',
        ...(config.headers ? config.headers : {}),
      },
      params: config.params, //* query string params
      data: config.data, //* body
      httpsAgent: agent,
    })

    return { data: response?.data, sessionRejected: false, usedB1Session }
  } catch (error: any) {
    const response = error?.response
    const responseData = response?.data
    const errorMessage = error?.message
    const sessionRejected = isSessionRejected(error)

    logger.error(errorMessage ? `${config.url} - ${errorMessage}` : `${config.url} - Failed to call SAP Service Layer API`)

    if (responseData) logger.error(responseData, 'SAP RESPONSE ERROR')

    //* no response at all (timeout, DNS, refused connection): synthesise the error shape so the
    //* caller sees a failure instead of an empty result it would read as success
    if (!response) {
      return {
        data: buildSapErrorResponse(error?.code || 'SAP_REQUEST_FAILED', errorMessage || 'Failed to call SAP Service Layer API'),
        sessionRejected,
        usedB1Session,
      }
    }

    //* SAP answered with an error body, it already carries { error: ... }, pass it through untouched
    if (responseData?.error) return { data: responseData, sessionRejected, usedB1Session }

    //* answered, but with nothing usable, still a failure
    return {
      data: buildSapErrorResponse(
        'SAP_REQUEST_FAILED',
        errorMessage || `SAP responded with status ${response?.status} and no error details`
      ),
      sessionRejected,
      usedB1Session,
    }
  }
}

//* routeid is optional so a session whose ROUTEID never arrived can still be logged out
export async function logoutSapServiceLayer(session: { b1session: string; routeid?: string }): Promise<void> {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false, timeout: REQUEST_TIMEOUT })

    const cookie = [session.b1session, session.routeid].filter(Boolean).join('; ')

    await axios.post(
      `${SAP_BASE_URL!.replace(/\/+$/, '')}/b1s/v1/Logout`,
      {},
      {
        httpsAgent: agent,
        timeout: REQUEST_TIMEOUT,
        headers: { Cookie: cookie },
      }
    )
    logger.info('Old SAP Service Layer session logged out')
  } catch (error) {
    // best-effort: don't block new login if logout fails (session may already be dead)
    logger.warn(`Failed to logout old SAP session (may already be expired): ${error}`)
  }
}
