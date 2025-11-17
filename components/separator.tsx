import { cn } from '@/utils'

type SeparatorProps = {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export default function Separator({ className, orientation = 'horizontal' }: SeparatorProps) {
  return <div className={cn('shrink-0 bg-slate-200', orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', className)} />
}
