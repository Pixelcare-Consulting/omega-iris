import { cn } from '@/utils'

type ContentContainerProps = {
  className?: string
  children: React.ReactNode
}

export default function ContentContainer({ className, children }: ContentContainerProps) {
  return <div className={cn('flex h-full w-full flex-col gap-5', className)}>{children}</div>
}
