'use client'

import { forwardRef } from 'react'
import { Button, IButtonOptions, ButtonRef } from 'devextreme-react/button'
import { Icons } from './icons'
import { cn } from '@/utils'

export type LoadingButtonProps = IButtonOptions & { isLoading?: boolean; loadingText?: string }

const LoadingButton = forwardRef<ButtonRef, LoadingButtonProps>(
  ({ isLoading, loadingText = 'Saving', children, disabled, icon, text, component, ...props }, ref) => (
    <Button
      ref={ref}
      disabled={isLoading || disabled}
      {...props}
      component={() => (
        <div className='dx-button-content'>
          {icon && !isLoading && <i className={cn(`dx-icon dx-icon-${icon} text-slate-400`, text && 'pr-2.5')} />}
          {isLoading && <Icons.spinner className='mr-1.5 size-4 animate-spin text-slate-400' />}
          <span className='dx-button-text'>{isLoading ? `${loadingText}...` : text}</span>
        </div>
      )}
    />
  )
)

LoadingButton.displayName = 'LoadingButton'

export default LoadingButton
