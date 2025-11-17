import { FormDescriptionProps } from '@/components/forms/form-description'
import { FormItemProps } from '@/components/forms/form-item'
import { FormLabelProps } from '@/components/forms/form-label'
import { FormMessageProps } from '@/components/forms/form-message'

export type FormExtendedProps = {
  formItem?: FormItemProps
  formLabel?: FormLabelProps
  formDescription?: FormDescriptionProps
  formMessage?: FormMessageProps
}

export type FormOption = { value: string; label: string }
export type FormDataSource = (FormOption & { [key: string]: any })[]
