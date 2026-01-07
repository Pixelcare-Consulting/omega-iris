import { cn } from '@/utils'
import { Icons } from './icons'

type ReadOnlyFieldProps = {
  className?: string
  title?: string
  value?: React.ReactNode
  isLoading?: boolean
  description?: string
  children?: React.ReactNode
}

export default function ReadOnlyField({ className, title, value, isLoading, description, children }: ReadOnlyFieldProps) {
  return (
    <div className={cn('relative space-y-1.5', className)}>
      {title && <div className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed'>{title}:</div>}

      <div className='dx-textbox dx-texteditor dx-editor-filled dx-widget min-h-8'>
        <div className='dx-texteditor-container'>
          <div className='dx-texteditor-input-container flex items-center justify-between px-3 py-1.5'>
            {!isLoading && value}

            {isLoading && (
              <div className='flex w-full items-center justify-between text-slate-400'>
                <span>Loading value...</span>
                <Icons.spinner className='size-4 animate-spin' />
              </div>
            )}

            {(!isLoading && children) ?? null}
          </div>
        </div>
      </div>

      <div className='text-xs text-slate-400'>{description}</div>
    </div>
  )
}
