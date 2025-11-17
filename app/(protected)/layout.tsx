import { auth } from '@/auth'
import { SessionProvider } from 'next-auth/react'
import PanelLayout from './_components/panel-layout'

export const dynamic = 'force-dynamic'

export default async function ProtectedRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      <PanelLayout user={session?.user}>{children}</PanelLayout>
    </SessionProvider>
  )
}
