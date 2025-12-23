'use client'

import { useEffect, useState } from 'react'
import { LoadPanel } from 'devextreme-react/load-panel'

export default function DashboardLoading() {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById('app-main-content')
    setContainer(el)
  }, [])

  if (!container) return null

  return (
    <LoadPanel
      container={container}
      shadingColor='rgb(241, 245, 249)'
      position={{
        of: container,
        at: 'center',
        my: 'center',
        offset: { x: 20, y: -50 },
      }}
      message='Loading data...'
      visible
      showIndicator
      showPane
      shading
    />
  )
}
