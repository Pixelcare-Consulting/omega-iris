'use client'

import { cn } from '@/utils'

export type FormItemProps = React.ComponentPropsWithoutRef<'div'>

export default function FormItem({ className, ...props }: FormItemProps) {
  return <div className={cn('relative space-y-1.5', className)} {...props} />
}
