'use server'

import axios from 'axios'
import https from 'https'

import { REQUEST_TIMEOUT } from '@/constants/sap'
import { SapCredentials, SapAuthCookies } from '@/types/sap'
import logger from '@/utils/logger'
import { getSapServiceLayerToken } from './sap-auth'

type AuthenticateSapServiceLayerResponse = {
  error?: boolean
  status: number
  message: string
  action: string
  data: { sapSession: SapAuthCookies | null }
}

export async function authenticateSapServiceLayer(credentials: SapCredentials): Promise<AuthenticateSapServiceLayerResponse> {
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
      throw new Error('Failed to extract session cookies from SAP response')
    }

    logger.info('SAP Service Layer authentication successful')

    //* return session
    return {
      status: 200,
      message: 'SAP Service Layer authentication successful',
      action: 'AUTH_SAP_SERVICE_LAYER',
      data: { sapSession: { b1session: b1sessionCookie, routeid: routeidCookie } },
    }
  } catch (error: any) {
    const errorMessage =
      error.code === 'ETIMEDOUT'
        ? `Connection timeout to SAP server (${credentials.baseUrl}). Please check if the server is accessible.`
        : `SAP Service Layer authentication failed: ${error.message}`

    logger.error(errorMessage)

    return { error: true, status: 500, message: errorMessage, action: 'AUTH_SAP_SERVICE_LAYER', data: { sapSession: null } }
  }
}

type CallSapServiceLayerApiParams = {
  url: string
  params?: string
  headers?: Record<string, any>
}

export async function callSapServiceLayerApi(params: CallSapServiceLayerApiParams): Promise<any> {
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
      return null
    }

    const sapSession = authCookies.data.sapSession

    //* create request
    const response = await axios.get(params.url, {
      headers: {
        Cookie: `${sapSession.b1session}; ${sapSession.routeid}`,
        'Content-Type': 'application/json',
        ...(params.headers ? params.headers : {}),
      },
      httpsAgent: agent,
      data: { ParamList: params },
    })

    return response.data
  } catch (error) {
    logger.error('Failed to call SAP Service Layer API')
    return null
  }
}
