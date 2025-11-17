import { Button } from 'devextreme-react/button'
import { Icons } from '@/components/icons'

import Link from 'next/link'

type AuthErrorKey = 'Configuration' | 'AccessDenied' | 'Verification' | 'Default'

type ErrorMap = Record<AuthErrorKey, { title: string; message: string }>

const errorMap: ErrorMap = {
  Configuration: {
    title: 'Configuration Error',
    message: 'There is a problem with the server configuration. Check the server logs for more information.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in.',
  },
  Verification: {
    title: 'Verification Error',
    message: 'The sign in link is no longer valid. It may have been used already or it may have expired.',
  },
  Default: {
    title: 'Authentication Server Error',
    message: 'An error occurred on the server. Try again later.',
  },
}

export default function AuthErrorPage({ searchParams }: { searchParams: { error: AuthErrorKey } }) {
  const error = errorMap[searchParams.error ?? 'Default']

  return (
    <div className='flex h-[100vh] w-[100vw] items-center justify-center'>
      <div className='flex flex-col items-center gap-y-4'>
        <Icons.triangleAlert
          className='size-20 text-primary [&>path:nth-child(2)]:stroke-white [&>path:nth-child(3)]:stroke-white'
          fill='#ED1C24'
        />

        <h1 className='text-dark text-balance text-center text-3xl font-extrabold'>{error.title}</h1>
        <p className='flex max-w-lg flex-col px-8 text-center text-xs leading-5 sm:p-0 sm:text-sm sm:leading-6 lg:text-base lg:leading-7'>
          {error.message}
        </p>

        <div className='dx-widget dx-button dx-button-mode-contained dx-button-danger dx-button-has-text dx-state-focused'>
          <div className='dx-button-content'>
            <Link className='dx-button-text' style={{ color: 'white' }} href='/signin'>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
