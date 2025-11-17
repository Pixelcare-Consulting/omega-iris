import { Icons } from '../icons'

export default function FormLoadingField() {
  return (
    <div className='dx-show-invalid-badge dx-textbox dx-texteditor dx-show-clear-button dx-editor-outlined dx-widget dx-state-disabled'>
      <div className='dx-texteditor-container'>
        <div className='dx-texteditor-input-container relative'>
          <input value='Loading data...' className='dx-texteditor-input' type='text' disabled />
          <Icons.spinner className='absolute right-2 top-1.5 size-4 animate-spin text-slate-400' />
        </div>
        <div className='dx-texteditor-buttons-container'></div>
      </div>
    </div>
  )
}
