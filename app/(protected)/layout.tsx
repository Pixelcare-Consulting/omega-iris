import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { SessionProvider } from 'next-auth/react'
import PanelLayout from './_components/panel-layout'
import ACLGuardProvider from '@/components/providers/acl-guard-provider'
import NotificationProvider from '@/components/providers/notification-provider'
import { getSapDatabaseAccess } from '@/utils/sap-database-access'

export const dynamic = 'force-dynamic'

export default async function ProtectedRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  //* the signed in session holds the database it was given, so access removed while the user is signed
  //* in only shows up here. send them back to pick another one, or out if they have none left
  if (session?.user?.sapDbCode) {
    const { isAllowed, hasAnySapDatabase } = await getSapDatabaseAccess(session.user.sapDbCode, session.user.roleCode)

    if (!isAllowed) redirect(hasAnySapDatabase ? '/choose-database' : '/unauthorized')
  }

  return (
    <SessionProvider session={session}>
      <ACLGuardProvider session={session}>
        {/* <NotificationProvider> */}
        <PanelLayout user={session?.user}>{children}</PanelLayout>
        {/* </NotificationProvider> */}
      </ACLGuardProvider>
    </SessionProvider>
  )
}
