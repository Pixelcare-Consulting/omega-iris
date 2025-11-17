import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-1 text-center text-xs font-semibold ring-1', {
  variants: {
    variant: {
      default: 'bg-primary text-white ring-primary/10',
      'soft-default': 'bg-primary-foreground text-primary ring-primary/10',
      slate: 'bg-slate-500 text-slate-50 ring-slate-500/10',
      gray: 'bg-gray-500 text-gray-50 ring-gray-500/10',
      zinc: 'bg-zinc-500 text-zinc-50 ring-zinc-500/10',
      neutral: 'bg-neutral-500 text-neutral-50 ring-neutral-500/10',
      stone: 'bg-stone-500 text-stone-50 ring-stone-500/10',
      red: 'bg-red-500 text-red-50 ring-red-500/10',
      orange: 'bg-orange-500 text-orange-50 ring-orange-500/10',
      amber: 'bg-amber-500 text-amber-50 ring-amber-500/10',
      yellow: 'bg-yellow-500 text-yellow-50 ring-yellow-500/10',
      lime: 'bg-lime-500 text-lime-50 ring-lime-500/10',
      green: 'bg-green-500 text-green-50 ring-green-500/10',
      emerald: 'bg-emerald-500 text-emerald-50 ring-emerald-500/10',
      teal: 'bg-teal-500 text-teal-50 ring-teal-500/10',
      cyan: 'bg-cyan-500 text-cyan-50 ring-cyan-500/10',
      sky: 'bg-sky-500 text-sky-50 ring-sky-500/10',
      blue: 'bg-blue-500 text-blue-50 ring-blue-500/10',
      indigo: 'bg-indigo-500 text-indigo-50 ring-indigo-500/10',
      violet: 'bg-violet-500 text-violet-50 ring-violet-500/10',
      purple: 'bg-purple-500 text-purple-50 ring-purple-500/10',
      fuchsia: 'bg-fuchsia-500 text-fuchsia-50 ring-fuchsia-500/10',
      pink: 'bg-pink-500 text-pink-50 ring-pink-500/10',
      rose: 'bg-rose-500 text-rose-50 ring-rose-500/10',
      'soft-slate': 'bg-slate-50 text-slate-600 ring-slate-500/10',
      'soft-gray': 'bg-gray-50 text-gray-600 ring-gray-500/10',
      'soft-zinc': 'bg-zinc-50 text-zinc-600 ring-zinc-500/10',
      'soft-neutral': 'bg-neutral-50 text-neutral-600 ring-neutral-500/10',
      'soft-stone': 'bg-stone-50 text-stone-600 ring-stone-500/10',
      'soft-red': 'bg-red-50 text-red-600 ring-red-500/10',
      'soft-orange': 'bg-orange-50 text-orange-600 ring-orange-500/10',
      'soft-amber': 'bg-amber-50 text-amber-600 ring-amber-500/10',
      'soft-yellow': 'bg-yellow-50 text-yellow-600 ring-yellow-500/10',
      'soft-lime': 'bg-lime-50 text-lime-600 ring-lime-500/10',
      'soft-green': 'bg-green-50 text-green-600 ring-green-500/10',
      'soft-emerald': 'bg-emerald-50 text-emerald-600 ring-emerald-500/10',
      'soft-teal': 'bg-teal-50 text-teal-600 ring-teal-500/10',
      'soft-cyan': 'bg-cyan-50 text-cyan-600 ring-cyan-500/10',
      'soft-sky': 'bg-sky-50 text-sky-600 ring-sky-500/10',
      'soft-blue': 'bg-blue-50 text-blue-600 ring-blue-500/10',
      'soft-indigo': 'bg-indigo-50 text-indigo-600 ring-indigo-500/10',
      'soft-violet': 'bg-violet-50 text-violet-600 ring-violet-500/10',
      'soft-purple': 'bg-purple-50 text-purple-600 ring-purple-500/10',
      'soft-fuchsia': 'bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-500/10',
      'soft-pink': 'bg-pink-50 text-pink-600 ring-pink-500/10',
      'soft-rose': 'bg-rose-50 text-rose-600 ring-rose-500/10',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
