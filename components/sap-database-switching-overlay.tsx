'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HashLoader } from 'react-spinners'

import { cn } from '@/utils'
import { Icons } from './icons'
import type { SapDatabaseSwitchStage } from '@/hooks/use-sap-database'

type SapDatabaseSwitchingOverlayProps = {
  stage: SapDatabaseSwitchStage
  databaseName: string | null
}

const STEPS = [
  { stage: 'verifying', label: 'Checking the connection' },
  { stage: 'updating', label: 'Updating your session' },
  { stage: 'preparing', label: 'Preparing your workspace' },
] as const

//* how long before we tell the user it is slow rather than stuck
const SLOW_SWITCH_MS = 8_000

export default function SapDatabaseSwitchingOverlay({ stage, databaseName }: SapDatabaseSwitchingOverlayProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isSlow, setIsSlow] = useState(false)

  //* portals need the dom, so hold off until after hydration
  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (!stage) {
      setIsSlow(false)
      return
    }

    const timer = setTimeout(() => setIsSlow(true), SLOW_SWITCH_MS)
    return () => clearTimeout(timer)
  }, [stage])

  if (!isMounted || !stage) return null

  //* past the last step on 'done', so every row renders as checked
  const currentIndex = stage === 'done' ? STEPS.length : STEPS.findIndex((step) => step.stage === stage)

  return createPortal(
    //! above the open dropdown (1500) and the top loader (1600), both would sit over a lower overlay
    <div
      role='status'
      aria-busy
      aria-live='polite'
      className='fixed inset-0 z-[1700] flex animate-in items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md fade-in duration-200 motion-reduce:animate-none'
    >
      <div className='flex w-full max-w-md animate-in flex-col items-center rounded-2xl bg-white px-12 py-16 text-center shadow-2xl fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none'>
        <HashLoader color='#ed1c24' size={80} />

        {/* //* the name is only missing if the switch started before the list loaded, so the title carries it alone */}
        {databaseName && (
          <div className='mt-10 flex items-center justify-center gap-2 text-sm text-slate-500'>
            <Icons.database className='size-4' />
            <span>Switching company to</span>
          </div>
        )}

        <h1 className={cn('text-2xl font-bold tracking-tight text-primary', databaseName ? 'mt-1.5' : 'mt-10')}>
          {databaseName ?? 'Switching company'}
        </h1>

        <p className='mt-2.5 text-sm text-slate-500'>Reconnecting and loading this company&apos;s data.</p>

        {/* //* rows stay left aligned inside a centered block, ragged rows are harder to scan */}
        <ul className='mx-auto mt-10 w-fit space-y-3.5 text-left'>
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex
            const isActive = index === currentIndex

            return (
              <li key={step.stage} className='flex items-center gap-2.5 text-sm'>
                <span className='flex size-4 shrink-0 items-center justify-center'>
                  {isDone && <Icons.check className='size-4 text-green-500' />}
                  {isActive && <Icons.spinner className='size-4 animate-spin text-[#ed1c24]' />}
                  {!isDone && !isActive && <span className='size-1.5 rounded-full bg-slate-200' />}
                </span>

                <span className={cn(isActive ? 'text-slate-900' : 'text-slate-400')}>{step.label}</span>
              </li>
            )
          })}
        </ul>

        {isSlow && <p className='mt-7 w-full border-t border-slate-100 pt-5 text-sm text-slate-500'>This is taking longer than usual.</p>}
      </div>
    </div>,
    document.body
  )
}
