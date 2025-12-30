'use client'

import { Control, Controller, FieldPath, FieldValues, get } from 'react-hook-form'
import TextBox, { ITextBoxOptions } from 'devextreme-react/text-box'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'

type ExtendedProps = FormExtendedProps & { textBoxOptions?: ITextBoxOptions }

type TextBoxFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  placeholder?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function TextBoxField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: TextBoxFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, formState: { errors } }) => {
        const fieldError = get(errors, name)
        const isValid = !fieldError
        const errorMessage = fieldError?.message as React.ReactNode

        return (
          <FormItem {...extendedProps?.formItem}>
            {!isHideLabel && label && (
              <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                {label}
              </FormLabel>
            )}

            <TextBox
              labelMode='hidden'
              placeholder={placeholder}
              isValid={isValid}
              value={field.value}
              valueChangeEvent='input'
              onValueChanged={(e) => {
                const value = e.value
                field.onChange(value)
                if (callback) callback({ value })
              }}
              showClearButton
              {...extendedProps?.textBoxOptions}
            />

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessage && <FormMessage {...extendedProps?.formMessage}>{errorMessage}</FormMessage>}
          </FormItem>
        )
      }}
    />
  )
}
