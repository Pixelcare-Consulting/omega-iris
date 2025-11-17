import { cn } from '@/utils'

type AsteriskRequiredProps = {
  className?: string
}

export default function AsteriskRequired({ className }: AsteriskRequiredProps) {
  return <span className={cn('text-rose-500', className)}>*</span>
}
