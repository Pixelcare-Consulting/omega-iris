'use client'

import Tooltip from 'devextreme-react/tooltip'
import { Position } from 'devextreme/common'
import { PositionConfig } from 'devextreme/common/core/animation'
import { cloneElement, DetailedReactHTMLElement } from 'react'

type TooltipWrapperProps = {
  targetId?: string
  label: string
  disabled?: boolean
  position?: PositionConfig | Position
  children: React.ReactNode
}

export default function TooltipWrapper({ targetId, label, disabled, position = 'top', children }: TooltipWrapperProps) {
  const childWithId = cloneElement(children as any, {
    id: targetId,
  })

  return (
    <>
      {!disabled && (
        <Tooltip
          target={`#${targetId}`}
          contentRender={() => label}
          showEvent='mouseenter'
          hideEvent='mouseleave'
          position={position}
          className='fixed'
        />
      )}
      {childWithId}
    </>
  )
}
