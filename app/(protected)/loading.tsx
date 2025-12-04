'use client'

import { LoadPanel } from 'devextreme-react/load-panel'

export default function DashboardLoading() {
  const container = document.getElementById('app-main-content')

  if (!container) return null

  return (
    <LoadPanel
      container='#app-main-content'
      shadingColor='rgb(241, 245, 249)'
      position={{ of: container, at: 'center', my: 'center', offset: { x: 20, y: -50 } }}
      message='Loading data...'
      visible
      showIndicator
      showPane
      shading
    />
  )
}
