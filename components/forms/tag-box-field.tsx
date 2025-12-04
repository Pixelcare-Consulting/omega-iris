'use client'

import { Control, Controller, ControllerRenderProps, FieldPath, FieldValues, Path } from 'react-hook-form'
import TagBox, { ITagBoxOptions, TagBoxTypes } from 'devextreme-react/tag-box'
import { Template } from 'devextreme-react/core/template'
import { isEqual } from 'radash'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import { Icons } from '../icons'
import { useCallback, useEffect } from 'react'
import FormLoadingField from './form-loading-field'

type ExtendedProps = FormExtendedProps & { tagBoxOptions?: ITagBoxOptions }

type TagBoxFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  data: any
  searchExpr: string | string[]
  displayExpr?: string | ((item: any) => string)
  valueExpr: string
  limit?: number
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

export default function TagBoxField<T extends FieldValues>({
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
}: TagBoxFieldProps<T>) {
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
              <TagBox
                dataSource={data}
                labelMode='hidden'
                placeholder={placeholder}
                isValid={isValid}
                searchExpr={searchExpr}
                valueExpr={valueExpr}
                value={field.value}
                displayExpr={displayExpr}
                valueChangeEvent='input'
                onValueChanged={(e) => {
                  const value = e.value
                  if (isEqual(value, field.value)) return
                  field.onChange(value)
                  if (callback) callback({ value: value })
                }}
                searchEnabled
                multiline
                hideSelectedItems
                showClearButton
                showDataBeforeSearch
                {...extendedProps?.tagBoxOptions}
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
