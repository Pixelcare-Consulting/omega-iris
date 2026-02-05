import { auth } from '@/auth'
import { SessionProvider } from 'next-auth/react'
import PanelLayout from './_components/panel-layout'
import ACLGuardProvider from '@/components/providers/acl-guard-provider'
import NotificationProvider from '@/components/providers/notification-provider'

export const dynamic = 'force-dynamic'

export default async function ProtectedRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

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
