'use client'

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { safeParseInt } from '@/utils'

export function useIdleSignout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastResetRef = useRef<number>(0)

  useEffect(() => {
    const IDLE_TIME = safeParseInt(process?.env?.NEXT_PUBLIC_MAX_IDLE_TIME_IN_MINUTE ?? 30) * 60 * 1000 //* Idle time default is 30 minutes
    const THROTTLE_MS = 500 //* only reset timer at most once every 500ms

    const handleSignout = async () => {
      await signOut({ redirect: false })
      setTimeout(() => window.location.assign('/signin'), 1000)
    }

    const resetTimer = () => {
      const now = Date.now()

      //* Throttle: skip if called too recently
      if (now - lastResetRef.current < THROTTLE_MS) return
      lastResetRef.current = now

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(handleSignout, IDLE_TIME)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'visibilitychange']

    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      console.log('IDLE TIMEOUT STOPPED...')

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [])
}
