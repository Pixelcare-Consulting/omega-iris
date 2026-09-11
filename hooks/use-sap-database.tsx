'use client'

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAction } from 'next-safe-action/hooks'

import { verifySapDatabaseConnection } from '@/actions/sap-database'
import { DEFAULT_SIGNIN_REDIRECT } from '@/constants/route'

//* reads and switches the session's SAP database — dropped on signout
export function useSapDatabase() {
  const { data: session, update } = useSession()
  const [isSwitching, setIsSwitching] = useState(false)
  const { executeAsync: verifyConnection } = useAction(verifySapDatabaseConnection)

  const sapDbCode = session?.user?.sapDbCode ?? null

  //* check SAP first, a database that cannot be reached must not become the session's database
  const switchDatabase = useCallback(
    async (dbCode: string) => {
      try {
        setIsSwitching(true)

        const verified = await verifyConnection({ dbCode })
        const verifyResult = verified?.data

        if (!verifyResult || verifyResult.error) {
          setIsSwitching(false)
          return { isSwitched: false, message: verifyResult?.message ?? 'Could not connect to SAP with this database.' }
        }

        const updatedSession = await update({ sapDbCode: dbCode })

        if (updatedSession?.user?.sapDbCode !== dbCode) {
          setIsSwitching(false)
          return { isSwitched: false, message: 'That database is no longer available. Please choose another one.' }
        }

        //* full page load, the current url may point to a record the new db doesn't have
        window.location.assign(DEFAULT_SIGNIN_REDIRECT)

        return { isSwitched: true }
      } catch (error) {
        console.error(error)
        setIsSwitching(false)
        return { isSwitched: false, message: 'Something went wrong! Please try again later.' }
      }
    },
    [update, verifyConnection]
  )

  return { sapDbCode, isSwitching, switchDatabase }
}
