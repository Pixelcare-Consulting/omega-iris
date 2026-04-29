'server'

import { action } from '@/utils/safe-action'

function getStimulsoftDashboardLicenseKey() {
  return process.env.STIMULSOFT_LICENSE_DASHBOARD_KEY || ''
}

export const getStimulsoftDashboardLicenseKeyClient = action.action(async () => {
  return getStimulsoftDashboardLicenseKey()
})

function getStimulsoftPaginatedLicenseKey() {
  return process.env.STIMULSOFT_LICENSE_PAGINATED_KEY || ''
}

export const getStimulsoftPaginatedLicenseKeyClient = action.action(async () => {
  return getStimulsoftPaginatedLicenseKey()
})
