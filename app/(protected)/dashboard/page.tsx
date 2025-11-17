'use client'

import { Button } from 'devextreme-react/button'
import { signOut, useSession } from 'next-auth/react'

export default function ProtectedDashboardPage() {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({
      redirect: false,
      callbackUrl: '/login',
    })

    window.location.assign('/signin')
  }

  return (
    <div>
      <div className='mb-4 flex flex-col'>
        <h1 className='text-2xl font-bold'>
          Protected Dashboard {session?.user && `- Hellow ${session.user.fname} ${session.user.lname}`}
        </h1>
        <p>This page is protected and can only be accessed by authenticated users.</p>
      </div>

      <Button type='default' stylingMode='contained' text='Sign out' icon='arrowleft' onClick={handleSignOut} />
    </div>
  )
}
