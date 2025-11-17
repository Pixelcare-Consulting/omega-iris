import Toolbar, { Item } from 'devextreme-react/toolbar'

import { cn } from '@/utils'

type PageHeaderProps = { className?: string; title?: string; description?: string; children?: React.ReactNode }

export default function PageHeader({ className, title, description, children }: PageHeaderProps) {
  return (
    <header className={cn('rounded-md bg-white px-4 py-3 shadow-md', className)}>
      <Toolbar>
        {title && description && (
          <Item
            location='before'
            render={() => (
              <div className='max-w-2xl flex-1'>
                <h1 className='text-base font-bold tracking-tight sm:text-lg md:text-lg lg:text-left lg:text-xl'>{title}</h1>
                <div className='line-clamp-1 text-slate-400 md:text-sm lg:text-left'>{description}</div>
              </div>
            )}
          />
        )}

        {children}
      </Toolbar>
    </header>
  )
}
