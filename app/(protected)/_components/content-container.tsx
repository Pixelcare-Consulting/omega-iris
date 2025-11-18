import { cn } from '@/utils'

type ContentContainerProps = {
  className?: string
  children: React.ReactNode
}

export default function ContentContainer({ className, children }: ContentContainerProps) {
  return <div className={cn('h-full w-full space-y-5', className)}>{children}</div>
}
