'use client'

import { cn } from '@/utils'

export type FormDescriptionProps = React.ComponentPropsWithoutRef<'div'>

export default function FormDescription({ className, ...props }: FormDescriptionProps) {
  return <div className={cn('text-[11px] text-slate-400', className)} {...props} />
}
