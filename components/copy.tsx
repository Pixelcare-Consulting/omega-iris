import { cn, copyText } from '@/utils'
import React from 'react'

type CopyProps = JSX.IntrinsicElements['i'] & { value: string | number | boolean | null | undefined | Record<string, any> }

export default function Copy({ value, ...props }: CopyProps) {
  return (
    <i
      {...props}
      className={cn('d-icon dx-icon-copy cursor-pointer text-xl text-slate-400 hover:text-primary', props.className)}
      onClick={copyText(String(value))}
    />
  )
}
