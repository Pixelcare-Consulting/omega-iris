'use client'

import { cn } from '@/utils'

export type FormMessageProps = React.ComponentPropsWithoutRef<'div'>

export default function FormMessage({ className, ...props }: FormMessageProps) {
  return (
    <div className='dx-invalid-message'>
      <div className={cn('dx-overlay-content relative', className)} {...props}>
        {props.children}
      </div>
    </div>
  )
}
