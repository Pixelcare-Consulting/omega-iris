import { cn } from '@/utils'
import React from 'react'

type ReadOnlyFieldHeaderProps = {
  className?: string
  title: React.ReactNode
  description: string
  actions?: React.ReactNode
}

export default function ReadOnlyFieldHeader({ className, title, description, actions }: ReadOnlyFieldHeaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 lg:flex-row lg:justify-between', className)}>
      <div className='flex flex-col justify-center'>
        <h2 className='mb-0 text-center font-bold lg:text-start'>{title}</h2>
        <p className='text-center text-xs text-slate-400 lg:text-start'>{description}</p>
      </div>

      {actions}
    </div>
  )
}
