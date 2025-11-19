'use server'

import { headers } from 'next/headers'

export async function getClientInfo() {
  try {
    const h = headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'Unknown'
    return ip
  } catch (error) {
    return 'Unknown'
  }
}

export async function getLocationFromIp(ip: string) {
  try {
    if (ip === '::1' || ip === '127.0.0.1') return 'Local Machine'

    //* API https://ip-api.com/docs/api:json
    //* limit - 45 HTTP requests per minute
    const response = await fetch(`http://ip-api.com/json/${ip}`)
    const result = await response.json()

    if (response.status === 200) {
      const location = []

      if (result.country) location.push(result.country)
      if (result.region) location.push(result.regionName)
      if (result.city) location.push(result.city)

      return location.join(', ')
    }
    return 'Unknown'
  } catch (error) {
    return 'Unknown'
  }
}
