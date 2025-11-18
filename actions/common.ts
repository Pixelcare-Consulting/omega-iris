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

export async function getLocationFromIP(ip: string) {
  try {
    //* API https://ip-api.com/docs/api:json
    //* limit - 45 HTTP requests per minute
    const res = await fetch(`http://ip-api.com/json/${ip}`)
    return res.json()
  } catch (error) {
    return 'Unknown'
  }
}
