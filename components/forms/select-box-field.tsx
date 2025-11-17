'use client'

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form'
import SelectBox, { ISelectBoxOptions } from 'devextreme-react/select-box'
import { Template } from 'devextreme-react/core/template'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import { Icons } from '../icons'
import FormLoadingField from './form-loading-field'

type ExtendedProps = FormExtendedProps & { selectBoxOptions?: ISelectBoxOptions }

type SelectBoxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  data: any
  searchExpr: string | string[]
  displayExpr: string | ((item: any) => string)
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

export default function SelectBoxField<T extends FieldValues>({
  data,
  searchExpr,
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
}: SelectBoxFieldProps<T>) {
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

            {!isLoading ? (
              <SelectBox
                dataSource={data}
                labelMode='hidden'
                placeholder={placeholder}
                isValid={isValid}
                value={field.value}
                searchExpr={searchExpr}
                valueExpr={valueExpr}
                displayExpr={displayExpr}
                onValueChanged={(e) => {
                  const item = data.find((d: any) => d[valueExpr] === e.value)
                  const value = e.value
                  field.onChange(value ?? '')
                  if (callback) callback({ value, item })
                }}
                searchEnabled
                showClearButton
                showDataBeforeSearch
                {...extendedProps?.selectBoxOptions}
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
