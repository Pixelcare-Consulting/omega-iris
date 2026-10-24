'use client'

import { useSession } from 'next-auth/react'

//* the active company's tfs mode, read off the session so no component has to fetch it
export function useCustomTfsProcess() {
  const { data: session, status } = useSession()
  //? isEnabled reads false while the session loads, check isLoading before trusting it
  return { isEnabled: !!session?.user?.isEnabledCustomTfsProcess, isLoading: status === 'loading' }
}
