'use server'

import { action } from '@/utils/safe-action'

function getStimulsoftLicenseKey() {
  return process.env.STIMULSOFT_LICENSE_KEY || ''
}

export const getStimulsoftLicenseKeyClient = action.action(async () => {
  return getStimulsoftLicenseKey()
})
