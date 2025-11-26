'use server'

import fs from 'fs'
import ini from 'ini'

import { authenticateSapServiceLayer } from './sap-service-layer'
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

export async function getSapServiceLayerToken(): Promise<GetSapServiceLayerTokenResponse> {
  let config: SapTokenConfig = {}

  //* Check if the token file exists
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    try {
      const fileContent = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8')
      config = ini.parse(fileContent)

      //* Check if the existing cookies are still valid (e.g., within a reasonable time frame)
      //* SAP Service Layer session timeout is typically 30 minutes (1800 seconds)

      const generatedAt = config.generatedAt || 0
      const currentTime = Date.now()

      //* Add a buffer (e.g., 60 seconds) to the expiry check
      const isTokenValid = config.b1session && config.routeid && currentTime - generatedAt < SESSION_TIMEOUT - EXPIRY_BUFFER

      if (isTokenValid) {
        logger.info('Using existing valid SAP Service Layer cookies.')

        return {
          status: 200,
          message: 'Using existing valid SAP Service Layer cookies.',
          data: { sapSession: { b1session: config.b1session!, routeid: config.routeid! } },
          action: 'GET_SAP_SERVICE_LAYER_TOKEN',
        }
      } else logger.info('SAP Service Layer cookies expired or invalid. Generating new ones.')
    } catch (error) {
      logger.error(`Error reading or parsing SAP Service Layer token file: ${error}`)
      logger.error('Generating new SAP Service Layer token')
    }
  } else logger.error('SAP Service Layer token file not found. Generating new cookies')

  //* If no valid cookies exist, generate new ones
  const newSapCookie = await generateNewSapServiceLayerToken()

  if (!newSapCookie) {
    return {
      error: true,
      status: 500,
      message: 'SAP Session not found!',
      action: 'GET_SAP_SERVICE_LAYER_TOKEN',
      data: { sapSession: null },
    }
  }

  //* update config with new session details
  config.b1session = newSapCookie.b1session
  config.routeid = newSapCookie.routeid
  config.generatedAt = Date.now()

  //* Save the new session to the file
  try {
    const newFileContent = ini.stringify(config)
    fs.writeFileSync(TOKEN_FILE_PATH, newFileContent)
    logger.info({ tokenFile: TOKEN_FILE_PATH, generatedAt: config.generatedAt }, 'New SAP Service Layer session saved to file')
  } catch (error) {
    logger.error(`Error writing SAP Service Layer token file: ${error}`)
  }

  return {
    status: 200,
    message: 'SAP Service Layer token generated successfully',
    action: 'GET_SAP_SERVICE_LAYER_TOKEN',
    data: { sapSession: newSapCookie },
  }
}

//* Generates new SAP Service Layer cookies by authenticating with the service layer.
async function generateNewSapServiceLayerToken(): Promise<SapAuthCookies | null> {
  try {
    const credentials: SapCredentials = {
      baseUrl: process.env.SAP_BASE_URL || '',
      companyDb: process.env.SAP_COMPANY_DB || '',
      userName: process.env.SAP_USERNAME || '',
      password: process.env.SAP_PASSWORD || '',
    }

    const response = await authenticateSapServiceLayer(credentials)

    if (response?.error) return null

    return response.data.sapSession
  } catch (error) {
    logger.error('Failed to generate new SAP Service Layer token')
    return null
  }
}
