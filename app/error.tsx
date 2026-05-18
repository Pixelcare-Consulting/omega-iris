'use client'

import Button from 'devextreme-react/button'
import { useRouter } from 'next/navigation'

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  function handleClick(href?: string) {
    if (href) {
      router.push(href)
      return
    }

    router.back()
  }

  return (
    <div className='h-screen w-screen px-2 py-4'>
      <div className='m-auto flex h-full w-full items-center justify-center rounded-lg p-6'>
        <div className='flex max-w-[480px] flex-col items-center justify-center gap-y-4'>
          <h1 className='w-fit text-7xl font-extrabold text-primary dark:text-slate-200'>500</h1>
          <div className='flex flex-col items-center justify-center gap-y-2'>
            <h2 className='w-fit text-2xl font-semibold'>Something went wrong!</h2>
            <p className='text-muted-foreground text-center text-base text-slate-400'>
              Unexpected error occurred. Please try again later or contact the administrator.
            </p>

            <div className='flex items-center gap-2'>
              <Button className='mt-3' type='danger' stylingMode='outlined' text='Try Again' icon='refresh' onClick={() => reset()} />

              <Button
                className='mt-3'
                type='danger'
                stylingMode='contained'
                text='Go Back'
                icon='arrowleft'
                onClick={() => handleClick('/')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
