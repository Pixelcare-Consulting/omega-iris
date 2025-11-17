'use client'

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form'
import TextArea, { ITextAreaOptions } from 'devextreme-react/text-area'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'

type ExtendedProps = FormExtendedProps & { textAreaOptions?: ITextAreaOptions }

type TextAreaFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  placeholder?: string
  description?: string
  isAutoResize?: boolean
  isRequired?: boolean
  isHideLabel?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  isAutoResize,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: TextAreaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, formState: { errors } }) => {
        const isValid = !Boolean(errors?.[name])
        const errorMessage = errors?.[name]?.message as React.ReactNode

        return (
          <FormItem {...extendedProps?.formItem}>
            {!isHideLabel && label && (
              <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                {label}
              </FormLabel>
            )}

            <TextArea
              labelMode='hidden'
              placeholder={placeholder}
              isValid={isValid}
              value={field.value}
              valueChangeEvent='input'
              autoResizeEnabled={isAutoResize}
              onValueChanged={(e) => {
                const value = e.value
                field.onChange(value)
                if (callback) callback({ value })
              }}
              showClearButton
              {...extendedProps?.textAreaOptions}
            />

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessage && <FormMessage {...extendedProps?.formMessage}>{errorMessage}</FormMessage>}
          </FormItem>
        )
      }}
    />
  )
}
