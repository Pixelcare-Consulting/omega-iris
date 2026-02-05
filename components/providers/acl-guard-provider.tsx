'use client'

import { AppAbility, buildAbilityFor } from '@/utils/acl'
import { Session } from 'next-auth'
import { useEffect, useState } from 'react'

import { useRouter } from 'nextjs-toploader/app'
import { usePathname } from 'next/navigation'
import { findNavByPath, navigation } from '@/constants/menu'
import { AbilityContext } from '@/context/ability'

type ACLGuardProviderProps = {
  session: Session | null
  children: React.ReactNode
}

//* ACL - Access Control List - refer a list of rules that determine who or what is allowed to access specific resources on a website or application.
export default function ACLGuardProvider({ session, children }: ACLGuardProviderProps) {
  const user = session?.user

  const router = useRouter()
  const pathname = usePathname()

  const [ability, setAbility] = useState<AppAbility | undefined>(undefined)

  useEffect(() => {
    if (!user) {
      setAbility(undefined)
      return
    }

    if (user.roleKey === 'admin') setAbility(buildAbilityFor({ roleKey: user.roleKey, rolePermissions: [] }))
    else setAbility(buildAbilityFor({ roleKey: user.roleKey, rolePermissions: user.rolePermissions }))
  }, [user])

  useEffect(() => {
    if (!ability || !user) return
    if (pathname === '/unauthorized') return

    const menuItem = findNavByPath(navigation, pathname)

    if (!menuItem || !menuItem.actions || !menuItem.subjects) return

    const actions = Array.isArray(menuItem.actions) ? menuItem.actions : [menuItem.actions]
    const subjects = Array.isArray(menuItem.subjects) ? menuItem.subjects : [menuItem.subjects]

    const isAllowed = actions.some((act) => subjects.some((sub) => ability.can(act, sub)))

    if (!isAllowed) router.push('/unauthorized')
  }, [ability, user, pathname])

  if (ability) return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>

  return <>{children}</>
}
