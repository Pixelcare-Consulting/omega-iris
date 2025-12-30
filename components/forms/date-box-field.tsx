'use client'

import { Control, Controller, FieldPath, FieldValues, get } from 'react-hook-form'
import DateBox, { IDateBoxOptions } from 'devextreme-react/date-box'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'

type ExtendedProps = FormExtendedProps & { dateBoxOptions?: IDateBoxOptions }

type DateBoxFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  type: 'date' | 'time' | 'datetime'
  label?: string
  placeholder?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function DateBoxField<T extends FieldValues>({
  control,
  name,
  label,
  type,
  placeholder,
  description,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: DateBoxFieldProps<T>) {
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

            <DateBox
              labelMode='hidden'
              placeholder={placeholder}
              type={type}
              isValid={isValid}
              value={field.value}
              valueChangeEvent='input'
              onValueChanged={(e) => {
                const value = e.value
                field.onChange(value)
                if (callback) callback({ value })
              }}
              showClearButton
              applyValueMode='useButtons'
              {...extendedProps?.dateBoxOptions}
            />

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessage && <FormMessage {...extendedProps?.formMessage}>{errorMessage}</FormMessage>}
          </FormItem>
        )
      }}
    />
  )
}
