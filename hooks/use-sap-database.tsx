'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAction } from 'next-safe-action/hooks'

import { verifySapDatabaseConnection } from '@/actions/sap-database'
import { DEFAULT_SIGNIN_REDIRECT } from '@/constants/route'
import { delay } from '@/utils'

//* the steps a switch runs through, null when idle — 'done' is every step checked, just before the page swaps
export type SapDatabaseSwitchStage = 'verifying' | 'updating' | 'preparing' | 'done' | null

//* floor per step, a cached switch would otherwise blink through all three before they can be read
const MIN_STAGE_MS = 700

//* how long the finished card stays up before the page swaps
const SETTLE_MS = 400

async function atLeast<T>(work: Promise<T>) {
  const [result] = await Promise.all([work, delay(MIN_STAGE_MS)])
  return result
}

//* reads and switches the session's SAP database — dropped on signout
export function useSapDatabase() {
  const { data: session, update } = useSession()
  const [stage, setStage] = useState<SapDatabaseSwitchStage>(null)
  const [targetDbCode, setTargetDbCode] = useState<string | null>(null)
  const { executeAsync: verifyConnection } = useAction(verifySapDatabaseConnection)

  const sapDbCode = session?.user?.sapDbCode ?? null

  //* check SAP first, a database that cannot be reached must not become the session's database
  const switchDatabase = useCallback(
    async (dbCode: string) => {
      try {
        setTargetDbCode(dbCode)
        setStage('verifying')

        const verified = await atLeast(verifyConnection({ dbCode }))
        const verifyResult = verified?.data

        if (!verifyResult || verifyResult.error) {
          setStage(null)
          return { isSwitched: false, message: verifyResult?.message ?? 'Could not connect to SAP with this database.' }
        }

        setStage('updating')

        const updatedSession = await atLeast(update({ sapDbCode: dbCode }))

        if (updatedSession?.user?.sapDbCode !== dbCode) {
          setStage(null)
          return { isSwitched: false, message: 'That database is no longer available. Please choose another one.' }
        }

        //* the session is settled, this step is the redirect being queued
        setStage('preparing')
        await delay(MIN_STAGE_MS)

        //* every step checked, so the card reads as finished before the page swaps
        setStage('done')
        await delay(SETTLE_MS)

        //* full page load, the current url may point to a record the new db doesn't have
        window.location.assign(DEFAULT_SIGNIN_REDIRECT)

        return { isSwitched: true }
      } catch (error) {
        console.error(error)
        setStage(null)
        return { isSwitched: false, message: 'Something went wrong! Please try again later.' }
      }
    },
    [update, verifyConnection]
  )

  return { sapDbCode, stage, targetDbCode, isSwitching: stage !== null, switchDatabase }
}
