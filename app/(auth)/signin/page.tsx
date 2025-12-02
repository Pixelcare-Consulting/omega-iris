import { Suspense } from 'react'

import { Icons } from '@/components/icons'
import SigninForm from './_components/signin-form'

export default function SigninPage() {
  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex flex-1'>
          <div className='flex flex-1 flex-col items-center justify-center gap-14'>
            <div className='flex justify-center gap-2 md:justify-start'>
              <div className='flex items-center'>
                <img className='mr-2 hidden w-32 md:block' src='/omega-logo.png' alt='Logo' />

                <div className='mr-2 hidden h-full w-0.5 bg-slate-800 md:block' />

                <div className='ml-3 flex flex-col justify-center'>
                  <h1 className='inline-block bg-clip-text text-center text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-left'>
                    Iris
                  </h1>
                  <p className='md:left -mt-1 inline-block text-center text-slate-500'>Inventory Management System</p>
                </div>
              </div>
            </div>

            <div className='w-full max-w-sm'>
              <Suspense>
                <SigninForm />
              </Suspense>
            </div>

            <p className='text-center text-xs text-slate-500'>© {new Date().getFullYear()} Iris | Omega. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className='relative hidden overflow-hidden bg-black lg:block'>
        <img src='/images/signin-hero.jpg' alt='Login hero' className='absolute inset-0 h-full w-full object-cover brightness-50' />

        <div className='relative flex h-full flex-col items-center justify-center p-8 text-center'>
          <div className='max-w-xl space-y-4'>
            <h1 className='text-4xl font-bold tracking-tight text-white sm:text-5xl'>
              Welcome to <span className='text-primary'>Iris</span>
            </h1>

            <p className='text-lg text-slate-50'>
              <span className='font-bold italic'>Track</span>, <span className='font-bold italic'>manage</span>, and{' '}
              <span className='font-bold italic'>streamline</span> your inventory with <span className='font-bold italic'>precision</span>{' '}
              and <span className='font-bold italic'>efficiency</span>
            </p>

            <div className='mx-auto mt-8 max-w-sm rounded-xl bg-black/30 p-6 backdrop-blur-sm'>
              <ul className='mx-auto flex max-w-[300px] flex-col gap-4 text-left text-sm text-slate-300'>
                {[
                  'Consignment Inventory Management',
                  'Stock Monitoring',
                  'Multi-Role Access Portals',
                  'Work Order Management',
                  'Alerts & Notifications',
                  'Customizable Analytics & Reporting',
                  'Secure & Scalable Infrastructure',
                  'Integration-ready',
                ].map((feature, i) => (
                  <li key={i} className='flex items-center gap-2'>
                    <div className='flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20'>
                      <Icons.check className='size-3.5 text-green-500' />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <p className='mt-6 text-xs tracking-wide text-slate-200'>CONTROL. INSIGHT. EFFICIENCY</p>
          </div>
        </div>
      </div>
    </div>
  )
}
