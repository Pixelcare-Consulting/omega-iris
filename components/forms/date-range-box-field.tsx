'use client'

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form'
import DateRangeBox, { IDateRangeBoxOptions } from 'devextreme-react/date-range-box'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'

type ExtendedProps = FormExtendedProps & { dateRangeBoxOptions?: IDateRangeBoxOptions }

type DateRangeBoxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function DateRangeBoxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isHideLabel,
  callback,
  extendedProps,
}: DateRangeBoxFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, formState: { errors } }) => {
        const isValid = !Boolean(errors?.[name])
        const errorMessages = errors?.[name] as Record<string, any>[] | React.ReactNode[]

        return (
          <FormItem {...extendedProps?.formItem}>
            {!isHideLabel && label && (
              <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                {label}
              </FormLabel>
            )}

            <DateRangeBox
              labelMode='hidden'
              isValid={isValid}
              value={field.value}
              valueChangeEvent='input'
              onValueChanged={(e) => {
                const [startDate, endDate] = e.value

                if (startDate && !endDate) {
                  field.onChange([startDate, undefined])
                  if (callback) callback({ value: [startDate, undefined] })
                  return
                }
                if (!startDate && endDate) {
                  field.onChange([undefined, endDate])
                  if (callback) callback({ value: [undefined, endDate] })
                  return
                }

                if (startDate && endDate) {
                  field.onChange([startDate, endDate])
                  if (callback) callback({ value: [startDate, endDate] })
                  return
                }

                field.onChange([undefined, undefined])
                if (callback) callback({ value: [undefined, undefined] })
              }}
              showClearButton
              applyValueMode='useButtons'
              {...extendedProps?.dateRangeBoxOptions}
            />

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessages && errorMessages?.length > 0 && (
              <FormMessage {...extendedProps?.formMessage}>
                {errorMessages.map(
                  (err: any, i) =>
                    err &&
                    err?.message && (
                      <span key={i}>
                        {err?.message} {i < errorMessages.length - 1 && ', '}
                      </span>
                    )
                )}
              </FormMessage>
            )}
          </FormItem>
        )
      }}
    />
  )
}
