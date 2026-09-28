'use client'

import { Control, Controller, FieldPath, FieldValues, get } from 'react-hook-form'
import TextBox, { ITextBoxOptions } from 'devextreme-react/text-box'
import { useDebouncedCallback } from 'use-debounce'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import FormLoadingField from './form-loading-field'

type ExtendedProps = FormExtendedProps & { textBoxOptions?: ITextBoxOptions }

type TextBoxFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  placeholder?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  isLoading?: boolean
  callback?: (...args: any[]) => void
  //* delay in ms before "callback" runs, so it fires once the user stops typing instead of per keystroke
  callbackDebounce?: number
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
  isLoading,
  callback,
  callbackDebounce,
  extendedProps,
}: TextBoxFieldProps<T>) {
  const debouncedCallback = useDebouncedCallback((...args: any[]) => callback?.(...args), callbackDebounce ?? 0)

  //* only debounce when a delay is given, otherwise keep the original per-change behavior
  const handleCallback = callbackDebounce ? debouncedCallback : callback

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
            {!isLoading ? (
              <TextBox
                labelMode='hidden'
                placeholder={placeholder}
                isValid={isValid}
                value={field.value}
                valueChangeEvent='input'
                onValueChanged={(e) => {
                  const value = e.value
                  field.onChange(value)
                  if (handleCallback) handleCallback({ value })
                }}
                showClearButton
                {...extendedProps?.textBoxOptions}
              />
            ) : (
              <FormLoadingField />
            )}

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessage && <FormMessage {...extendedProps?.formMessage}>{errorMessage}</FormMessage>}
          </FormItem>
        )
      }}
    />
  )
}
