import { Icons } from '@/components/icons'
import { cn } from '@/utils'
import React from 'react'

type UnderDevelopmentProps = {
  title?: string
  description?: string
  className?: string
}

export default function UnderDevelopment({
  title = 'Under Development',
  description = 'This feature is under development.',
  className,
}: UnderDevelopmentProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className='flex flex-col items-center justify-center'>
        <Icons.construction className='text-destructive size-14' />
        <div className='mt-2.5 flex flex-col items-center justify-center gap-1'>
          <h1 className='text-center text-xl font-bold'>{title || 'Under Development'}</h1>
          <p className='text-center text-sm text-slate-500 dark:text-slate-400'>{description || 'This feature is under development.'}</p>
        </div>
      </div>
    </div>
  )
}
