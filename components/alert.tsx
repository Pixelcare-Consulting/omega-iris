import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'
import { Icons } from './icons'

type AlertProps = {
  className?: string
  message?: string
} & VariantProps<typeof alertVariants>

const alertVariants = cva('p-3 text-sm rounded-md flex items-center gap-x-2', {
  variants: {
    variant: {
      default: 'bg-blue-500/15 text-blue-500',
      error: 'bg-rose-500/15 text-rose-500',
      success: 'bg-green-500/15 text-green-500',
      warning: 'bg-amber-500/15 text-amber-500',
      loading: 'bg-slate-500/15 text-slate-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const icons: Record<NonNullable<AlertProps['variant']>, JSX.Element> = {
  default: <i className='dx-icon-info text-xl text-blue-500' />,
  error: <i className='dx-icon-errorcircle text-xl text-rose-500' />,
  success: <i className='dx-icon-checkmarkcircle green-green-500 text-xl' />,
  warning: <i className='dx-icon-warning text-xl text-amber-500' />,
  loading: <Icons.spinner className='size-5 animate-spin text-slate-500' />,
}

export default function Alert({ message, variant, className }: AlertProps) {
  const alertVariant = variant ?? 'default'
  const Icon = icons[alertVariant as NonNullable<AlertProps['variant']>]

  if (!message) return null

  return (
    <div className={cn(alertVariants({ variant, className }))}>
      {Icon}
      <p className='inline-block w-full break-words font-medium'>{message}</p>
    </div>
  )
}
