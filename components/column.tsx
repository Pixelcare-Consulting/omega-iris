import { HiddenFieldsContext } from '@/context/hidden-fields-context'
import { Column as DataGridColumn, IColumnProps } from 'devextreme-react/data-grid'
import { useContext } from 'react'

type CustomColumnProps = IColumnProps

export default function Column({ ...props }: CustomColumnProps) {
  const hiddenFieldContext = useContext(HiddenFieldsContext)
  const hiddenFields = hiddenFieldContext?.hiddenFields

  if (hiddenFields && hiddenFields.length > 0 && hiddenFields.includes(props?.dataField ?? '')) return null

  return <DataGridColumn {...props} />
}
