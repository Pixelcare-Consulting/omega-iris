'use client'

import { LoadPanel } from 'devextreme-react/load-panel'

export default function DashboardLoading() {
  return <LoadPanel shadingColor='rgb(241, 245, 249)' position='center' message='Loading data...' visible showIndicator showPane shading />
}
