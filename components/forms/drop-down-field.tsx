'use client'

import { Control, Controller, FieldPath, FieldValues, get } from 'react-hook-form'
import { DropDownBox, DropDownBoxTypes, IDropDownBoxOptions } from 'devextreme-react/drop-down-box'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import { Icons } from '../icons'
import FormLoadingField from './form-loading-field'
import { useCallback, useEffect, useState } from 'react'

type ExtendedProps = FormExtendedProps & { dropdownBoxOptions?: IDropDownBoxOptions }

type DropDownBoxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  data: any
  isOpen?: boolean
  displayExpr?: string | ((item: any) => string)
  valueExpr: string
  isLoading?: boolean
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

export default function DaBoxField<T extends FieldValues>({
  data,
  isOpen,
  valueExpr,
  displayExpr,
  isLoading,
  control,
  name,
  label,
  placeholder,
  description,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: DropDownBoxFieldProps<T>) {
  const [dropDownIsOpened, setDropDownIsOpened] = useState(false)

  const onOptionChanged = useCallback((e: DropDownBoxTypes.OptionChangedEvent): void => {
    if (e.name === 'opened') {
      setDropDownIsOpened(e.value)
    }
  }, [])

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
              <DropDownBox
                dataSource={data}
                opened={dropDownIsOpened}
                labelMode='hidden'
                placeholder={placeholder}
                isValid={isValid}
                value={field.value}
                valueExpr={valueExpr}
                displayExpr={displayExpr}
                valueChangeEvent='input'
                onValueChanged={(e) => {
                  const item = data.find((d: any) => d[valueExpr] === e.value)
                  const value = e.value
                  field.onChange(value ?? '')
                  setDropDownIsOpened(false)
                  if (callback) callback({ value, item })
                }}
                onOptionChanged={onOptionChanged}
                showClearButton
                {...extendedProps?.dropdownBoxOptions}
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
