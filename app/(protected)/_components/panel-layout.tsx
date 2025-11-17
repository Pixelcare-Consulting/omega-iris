'use client'

import { useState } from 'react'

import { ExtendedUser } from '@/auth'
import Header from './header'
import Sidebar from './sidebar'

type PanelLayoutProps = { user?: ExtendedUser; children: React.ReactNode }

export default function PanelLayout({ user, children }: PanelLayoutProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (!user) return null

  return (
    <div>
      <Header setIsOpen={setIsOpen} user={user} />
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen}>
        {children}
      </Sidebar>
    </div>
  )
}
