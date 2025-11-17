'use client'

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form'
import Switch, { type ISwitchOptions } from 'devextreme-react/switch'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import { cn } from '@/utils'

type ExtendedProps = FormExtendedProps & { switchOptions?: ISwitchOptions }

type SwitchFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  control: Control<TFieldValues>
  name: TName
  layout?: 'default' | 'wide' | 'centered'
  label?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function SwitchField<T extends FieldValues>({
  control,
  name,
  layout = 'default',
  label,
  description,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: SwitchFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, formState: { errors } }) => {
        const isValid = !Boolean(errors?.[name])

        switch (layout) {
          case 'wide':
            return (
              <FormItem
                {...extendedProps?.formItem}
                className={cn('flex flex-row items-center justify-between rounded-lg border p-4', extendedProps?.formLabel?.className)}
              >
                <div className='space-y-0.5'>
                  {!isHideLabel && label && (
                    <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                      {label}
                    </FormLabel>
                  )}
                  {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}
                </div>

                <Switch
                  isValid={isValid}
                  value={field.value}
                  onValueChanged={(e) => {
                    const value = e.value
                    field.onChange(value)
                    if (callback) callback({ value })
                  }}
                  {...extendedProps?.switchOptions}
                />
              </FormItem>
            )

          case 'centered':
            return (
              <FormItem {...extendedProps?.formItem} className={cn('flex flex-col items-center justify-center rounded-lg border p-4')}>
                <Switch
                  isValid={isValid}
                  value={field.value}
                  onValueChanged={(e) => {
                    const value = e.value
                    field.onChange(value)
                    if (callback) callback({ value })
                  }}
                  {...extendedProps?.switchOptions}
                />

                <div className='space-y-0.5'>
                  {!isHideLabel && label && (
                    <FormLabel
                      {...extendedProps?.formLabel}
                      className={cn('inline-block w-full text-center', extendedProps?.formLabel?.className)}
                      isRequired={isRequired}
                      isValid={isValid}
                    >
                      {label}
                    </FormLabel>
                  )}

                  {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}
                </div>
              </FormItem>
            )

          default:
            return (
              <FormItem {...extendedProps?.formItem}>
                <div className='flex items-center gap-2'>
                  <Switch
                    isValid={isValid}
                    value={field.value}
                    onValueChanged={(e) => {
                      const value = e.value
                      field.onChange(value)
                      if (callback) callback({ value })
                    }}
                    {...extendedProps?.switchOptions}
                  />

                  {!isHideLabel && label && (
                    <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                      {label}
                    </FormLabel>
                  )}
                </div>

                {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}
              </FormItem>
            )
        }
      }}
    />
  )
}
