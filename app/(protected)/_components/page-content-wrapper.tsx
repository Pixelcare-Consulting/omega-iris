import { cn } from '@/utils'

type PageContentWrapperProps = { className?: string; children: React.ReactNode }

//? add h-full w-full - for full widht and height
export default function PageContentWrapper({ className, children }: PageContentWrapperProps) {
  return <div className={cn('rounded-md bg-white p-4 shadow-md', className)}>{children}</div>
}
