'use client'

import { useSession } from 'next-auth/react'

//* the active company's tfs mode, read off the session so no component has to fetch it
export function useCustomTfsProcess() {
  const { data: session } = useSession()
  return { isEnabled: !!session?.user?.isEnabledCustomTfsProcess }
}
