'use client'

import { Icons } from '@/components/icons'
import { Button } from 'devextreme-react/button'

export default function AuthErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className='flex h-screen items-center justify-center'>
      <div className='flex max-w-[480px] flex-col items-center justify-center gap-y-4'>
        <Icons.triangleAlert
          className='size-20 text-primary [&>path:nth-child(2)]:stroke-white [&>path:nth-child(3)]:stroke-white'
          fill='#ED1C24'
        />
        <div className='flex flex-col items-center justify-center gap-y-2'>
          <h2 className='w-fit text-2xl font-semibold'>Something went wrong!</h2>
          <p className='text-muted-foreground text-center text-base text-slate-400'>Unexpected error occurred.</p>
        </div>

        <Button type='danger' stylingMode='contained' text='Try Again' onClick={() => reset()} />
      </div>
    </div>
  )
}
