import { cn } from '@/utils'
import { PulseLoader } from 'react-spinners'

export default function ReportInitializing({ className }: { className?: string }) {
  return (
    <div>
      <div className={cn('flex flex-1 flex-col items-center justify-center', className)}>
        <PulseLoader className='mb-1' color='#ed1c24' />
        <div className='mt-2.5 flex flex-col items-center justify-center gap-1'>
          <h1 className='text-center text-xl font-bold text-primary'>Initializing Components</h1>
          <p className='text-center text-sm text-slate-500 dark:text-slate-400'>Please wait while the components are being initialized.</p>
        </div>
      </div>
    </div>
  )
}
