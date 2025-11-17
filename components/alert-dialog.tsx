'use client'

import { Popup, ToolbarItem, IPopupOptions } from 'devextreme-react/popup'
import Button from 'devextreme-react/button'

type ExtendedProps = { popupOptions?: IPopupOptions }

type AlertDialogProps = {
  isOpen?: boolean
  title: string
  description: string
  height?: string | number
  maxWidth?: string | number
  onConfirm: () => void
  onConfirmText?: string
  onCancel: () => void
  onCancelText?: string
  extendedProps?: ExtendedProps
}

export default function AlertDialog({
  isOpen,
  title,
  height = 170,
  maxWidth = 800,
  description,
  onConfirm,
  onConfirmText = 'Confirm',
  onCancel,
  onCancelText = 'Cancel',
  extendedProps,
}: AlertDialogProps) {
  return (
    <Popup
      visible={isOpen}
      dragEnabled={false}
      showCloseButton={false}
      showTitle={false}
      title={title}
      width='fit-content'
      height={height}
      maxWidth={maxWidth}
      {...extendedProps?.popupOptions}
    >
      <div className='pt-4'>
        <h2 className='mb-1.5 text-lg font-semibold'>{title}</h2>
        <p className='text-sm text-slate-400'>{description}</p>
      </div>

      <ToolbarItem toolbar='bottom' widget='dxButton' location='after' locateInMenu='never'>
        <Button text={onCancelText} type='normal' stylingMode='outlined' onClick={onCancel} />
      </ToolbarItem>
      <ToolbarItem toolbar='bottom' widget='dxButton' location='after' locateInMenu='never'>
        <Button text={onConfirmText} type='default' stylingMode='contained' onClick={onConfirm} />
      </ToolbarItem>
    </Popup>
  )
}
