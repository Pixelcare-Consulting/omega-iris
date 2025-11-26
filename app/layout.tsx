import { Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'

import DxOmit from '@/components/dx-omit'
import TailwindIndicatorProvider from '@/components/providers/tailwind-indicator-provider'
import '../styles/globals.css'
import ToastProvider from '@/components/providers/toast-provider'
import logger from '@/utils/logger'

export const metadata = {
  title: 'Iris | Omega',
  description: 'Omega GTI Inventory Management System',
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bodyClassName = `${inter.variable} dx-viewport dx-device-desktop dx-device-generic dx-theme-fluent dx-theme-fluent-typography dx-color-scheme-saas-light`

  return (
    <html className='h-full scroll-smooth' lang='en' suppressHydrationWarning>
      <body className={bodyClassName}>
        <DxOmit>
          <NextTopLoader
            color='#ED1C24'
            initialPosition={0.08}
            crawlSpeed={200}
            height={4}
            crawl={true}
            showSpinner={false}
            easing='ease'
            speed={200}
            zIndex={1600}
            showAtBottom={false}
          />
          {children}

          <ToastProvider />
          <TailwindIndicatorProvider />
        </DxOmit>
      </body>
    </html>
  )
}
