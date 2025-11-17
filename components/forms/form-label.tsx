'use client'

import { cn } from '@/utils'
import AsteriskRequired from '../asterisk-required'

export type FormLabelProps = React.ComponentPropsWithoutRef<'div'> & { isRequired?: boolean; isValid?: boolean; readonly?: boolean }

export default function FormLabel({ children, className, isRequired, isValid, readonly, ...props }: FormLabelProps) {
  return (
    <div
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed',
        !isValid && !readonly ? 'text-red-500' : '',
        className
      )}
      {...props}
    >
      {children} {isRequired && <AsteriskRequired />}
    </div>
  )
}
